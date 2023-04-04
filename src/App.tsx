import React, { useEffect, useState } from 'react';
import './App.css';
import {ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi} from 'openai';
import markdownit from 'markdown-it';
import { ipcRenderer } from 'electron';
import { encoding_for_model } from "@dqbd/tiktoken";

const OLD_MESSAGES_TOKEN_LIMIT = 2048;
const MESSAGES_TOKEN_LIMIT = 1024 * 3;

declare global {
  interface Window {
      ipcRenderer: typeof ipcRenderer;
  }
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// メッセージ履歴を取得する関数
const getMessageHistoryFromLocalStorage = (): Message[] => {
  const storedHistory = localStorage.getItem('messageHistory');
  return storedHistory ? JSON.parse(storedHistory) : [];
};

const utf8Decoder = new TextDecoder('utf-8')

const decodeResponse = (response?: Uint8Array) => {
  if (!response) {
    return ''
  }

  const pattern = /"delta":\s*({.*?"content":\s*".*?"})/g
  const decodedText = utf8Decoder.decode(response)
  const matches: string[] = []

  let match
  while ((match = pattern.exec(decodedText)) !== null) {
    matches.push(JSON.parse(match[1]).content)
  }
  return matches.join('')
}

var context = new AudioContext();

const VOICEVOX_URI = 'http://localhost:50021';
const createVoice = async (text: string, speaker: number = 1) => {
  // const query = await client.query.createQuery(0, text);
  const query = await fetch(`${VOICEVOX_URI}/audio_query?text=${encodeURI(text)}&speaker=${speaker}`, {
    method: 'POST',
  });
  const synthesis = await fetch(`${VOICEVOX_URI}/synthesis?speaker=${speaker}`,{
    method: 'POST',
    body: await query.arrayBuffer(),
    headers: {
      'Content-Type': 'application/json',
      'accept': 'audio/wav',
    }
  });
  return await synthesis.arrayBuffer();
}
// シンプルなタスクランナー
let createVoiceTasks = Promise.resolve();
let playVoiceTasks = Promise.resolve();
const wait = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// 音声合成を行い再生するタスクをランナーに依頼する関数
const playVoice = async (text: string, speakerId: number) => {
  createVoiceTasks = createVoiceTasks.then(() => {
    return new Promise(async (resolve) => {
      const audioData = await createVoice(text, speakerId);
      playVoiceTasks = playVoiceTasks
      .then(() => wait(200)) // 1秒待つ
      .then(() => { // 再生する
        return new Promise(async (resolve) => {
          const source = context.createBufferSource();
          source.buffer = await context.decodeAudioData(audioData);
          source.connect(context.destination);
          source.onended = () => {resolve();};
          source.start();
        });
      });
      resolve();
    });
  });
}

const enc = encoding_for_model("gpt-3.5-turbo");

type Conversation = {
  name: string;
  speakerId: string;
};

function App() {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [apiKey, setApiKey] = useState('');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [playVoiceUserInput, setPlayVoiceUserInput] = useState(false);
  const [userInputSpeakerId, setUserInputSpeakerId] = useState('16');
  const [playVoiceResponse, setPlayVoiceResponse] = useState(false);
  const [responseSpeakerId, setResponseSpeakerId] = useState('3');
  const [playInMiddle, setPlayInMiddle] = useState(true);
  const [userInputTokenCount, setUserInputTokenCount] = useState(0);
  const [messagesTokenCount, setMessagesTokenCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [playConversation, setPlayConversation] = useState(false);

  const handleToggleApiKeyInput = () => {
    setShowApiKeyInput(!showApiKeyInput);
  };

  // アプリケーションがマウントされたときにAPIキーをローカルストレージから取得
  useEffect(() => {
    const storedApiKey = localStorage.getItem('apiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      // APIキーがローカルストレージに保存されている場合はAPIキー入力欄を非表示にする
      setShowApiKeyInput(false);
    }
  }, []);

  // アプリケーションがマウントされたときにメッセージ履歴をローカルストレージから取得
  useEffect(() => {
    setMessages(getMessageHistoryFromLocalStorage());
  }, []);

  useEffect(() => {
    window.ipcRenderer?.on('focus', (event, message) => {
      textareaRef.current?.focus();
    });
    window.ipcRenderer?.on('paste', (event, message) => {
      const clipboardText = window.clipboard.readText();
      setUserInput(clipboardText);
      setTimeout(() => {
        textareaRef.current?.select();
      }, 0);
    });
  }, []);
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('apiKey', newApiKey);
  };

  // GPTにメッセージを送信する関数
  const handleSend = async (_userInput?: string) => {
    const userInputContent = _userInput || userInput;
    if (!userInputContent || !apiKey) return;

    setMessages((prevMessages) => [...prevMessages, { role: 'user', content: userInputContent }]);

    const configuration = new Configuration({
      apiKey
    });
    const openai = new OpenAIApi(configuration);

    const requestMessages = [...messages, {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: `${userInputContent}`,
    }];
    // メッセージのトークン数が上限を超えている場合は古いメッセージを削除
    while (requestMessages.map(m => countTokens(m.content)).reduce((a, b) => a + b) > OLD_MESSAGES_TOKEN_LIMIT) {
      // メッセージ履歴のトークン数を減らす
      requestMessages.shift();
    }
    const requestMessagesToken = requestMessages.map(m => countTokens(m.content)).reduce((a, b) => a + b) + countTokens(userInputContent);
    if (requestMessagesToken > MESSAGES_TOKEN_LIMIT) {
      setError(`メッセージのトークン数が上限(${MESSAGES_TOKEN_LIMIT})を超えています。`);
      return;
    }

    const requestOptions: CreateChatCompletionRequest = {
      model: 'gpt-3.5-turbo',
      messages: requestMessages,
      n: 1,
      temperature: 0.8,
      stream: true,
    };

    setUserInput('');
    setError('');
    
    try {
      // const result = openai.createChatCompletion(requestOptions, {responseType: 'stream'});
      const API_URL = 'https://api.openai.com/v1/chat/completions'
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestOptions),
      })
      setUserInput('');
      playVoiceUserInput && playVoice(userInput, parseInt(userInputSpeakerId))

      if (!response.body) throw new Error('No response body');
      if (!response.ok) {
        const reader = response.body?.getReader();
        const { done, value } = await reader.read();
        const error = JSON.parse(utf8Decoder.decode(value)).error;
        const errorMessage = `${error.code}: ${error.message}`;
        setError(errorMessage);
        setResponse('');
        return;
      }
      const reader = response.body.getReader();

      let fullText = '';
      const spokenArray: string[] = [];
      const resRe = /([^。！？]{1,}[。！？])/g;
      const convRe = /(\S+)「(.+?)[」\n]/g;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const delta = decodeResponse(value)
        fullText += delta

        setResponse(markdownit().render(fullText));

        if (playInMiddle) {
          // 回答を読み上げる
          if (playVoiceResponse) {
            let match;
            while ((match = resRe.exec(fullText)) !== null) {
              if (spokenArray.includes(match[1])) continue;
              playVoice(match[1], parseInt(responseSpeakerId))
              console.log(match[1]);
              spokenArray.push(match[1]);
            }
          }
          // 会話を読み上げる
          if (playConversation) {
            let match1;
            let i = 0;
            while ((match1 = convRe.exec(fullText)) !== null) {
              const name = match1[1];
              const text = match1[2];
              let speakerId: string = "0";
              conversations.filter((conv) => conv.name === name).forEach((conv) => {                
                speakerId = conv.speakerId;
              });
              let match2;
              while ((match2 = resRe.exec(text)) !== null) {
                // 既に読み上げた会話は読み上げない
                if (spokenArray[i]) {
                  i++;
                  continue;
                }
                console.log(`${i}:${match2[1]}`);
                playVoice(match2[1], parseInt(speakerId))
                // 会話を読み上げたことを記録
                spokenArray[i] = match2[1];
                i++;
              }
            }
          }
        }
      }

      setResponse('');
      setMessages((prevMessages) => {
        // メッセージ履歴を更新
        const updatedMessages = [...prevMessages, { role: 'assistant', content: fullText } as Message];
        // メッセージ履歴をローカルストレージに保存
        localStorage.setItem('messageHistory', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
      setError('');
      playVoiceResponse && !playInMiddle && playVoice(fullText, parseInt(responseSpeakerId));
    } catch (error) {
      console.error(error);
      setResponse('Error: Failed to get a response from ChatGPT.');
      setError(`Error: ${error}`);
    }

  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend();
      e.preventDefault(); // デフォルトのEnterキーの動作（改行）をキャンセル
    }
  };

  // 履歴を削除する
  const handleClearHistory = () => {
    localStorage.removeItem('messageHistory');
    setMessages([]);
  };

  // メッセージをクリップボードにコピーする
  const handleCopyToClipboard = async (message: Message) => {
    if (window.clipboard?.writeText) {
      // electronの場合はwindow.clipboard.writeTextを使う
      window.clipboard.writeText(message.content);
    } else {
      // ブラウザの場合はnavigator.clipboard.writeTextを使う
      await navigator.clipboard.writeText(message.content);
    }
  };

  // スクロールを一番下に移動する
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // トークン数をカウントする
  const countTokens = (text: string) => {
    return enc.encode(text).length;
  };

  // 質問のトークン数を計算する
  useEffect(() => {
    const tokenCount = countTokens(userInput);
    setUserInputTokenCount(tokenCount);
  }, [userInput]);

  // 会話や応答が更新された時
  useEffect(() => {
    // responseやmessagesが変更されたときにスクロール処理を実行
    scrollToBottom();
    // 会話のトークン数を計算
    if (messages.length > 0) {
      setMessagesTokenCount(messages.map(m => countTokens(m.content)).reduce((a, b) => a + b) + countTokens(response));
    }
  }, [response, messages]);

  // 履歴をMarkdown形式でクリップボードにコピーする
  const handleExportHistory = async () => {
    // メッセージ履歴をMarkdown形式のテキストに変換する
    const markdownHistory = messages.map((message) => {
      if (message.role === "user") {
        return `\`\`\`\n${message.content}\n\`\`\`\n↓\n`;
      } else {
        return `${message.content}\n\n----\n`;
      }
    }).join("");

    // クリップボードにコピーする
    try {
      if (window.clipboard?.writeText) {
        window.clipboard.writeText(markdownHistory);
      } else {
        await navigator.clipboard.writeText(markdownHistory);
      }
      alert("Message history has been copied to the clipboard.");
    } catch (err) {
      console.error("Failed to copy message history to the clipboard: ", err);
      alert("Failed to copy message history to the clipboard.");
    }
  };

  // ResponseとUserInputの再生チェックをローカルストレージから読み込む
  useEffect(() => {
    localStorage.getItem('playResponse') === 'true' && setPlayVoiceResponse(true);
    localStorage.getItem('playUserInput') === 'true' && setPlayVoiceUserInput(true);
  }, []);
  // Responseを再生するかどうかの設定を変更
  const handlePlayVoiceResponseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayVoiceResponse(e.target.checked);
    localStorage.setItem('playResponse', e.target.checked.toString());
  };
  // UserInputを再生するかどうかの設定
  const handlePlayVoiceUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayVoiceUserInput(e.target.checked);
    localStorage.setItem('playUserInput', e.target.checked.toString());
  };
  // 会話の再生チェックをローカルストレージから読み込む
  useEffect(() => {
    localStorage.getItem('playConversation') === 'true' && setPlayConversation(true);
    localStorage.getItem('conversations') && setConversations(JSON.parse(localStorage.getItem('conversations') || '[]'));
  }, []);
  const saveConversations = (value: Conversation[]) => {
    localStorage.setItem('conversations', JSON.stringify(value));
  };
  // 会話を再生するかどうかの設定を変更
  const handlePlayConversationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayConversation(e.target.checked);
    localStorage.setItem('playConversation', e.target.checked.toString());
  };

  return (
    <div className="App">
      <h1>ChatGPT Electron App</h1>
      <p>Alt + Spaceでウィンドウ呼び出し</p>
      {showApiKeyInput ? (
        <>
          <label htmlFor="api-key">API Key:</label>
          <input
            id="api-key"
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter your OpenAI API key"
          />
          <button onClick={handleToggleApiKeyInput}>Hide API Key Input</button>
        </>
      ) : (
        <button onClick={handleToggleApiKeyInput}>Show API Key Input</button>
      )}
      <button onClick={handleClearHistory}>Clear History</button>
      <button onClick={handleExportHistory}>Export History</button>
      { apiKey && (
        <>
          <hr/>
          {/* <button onClick={handleSend}>Send</button> */}

          {/* messagesステートを繰り返し処理して、メッセージを表示 */}
          <div className="messages">
            {messages.map((message, index) => (
              <>
                <div
                  key={index}
                  className={message.role === 'user' ? 'user-message' : 'assistant-message'}
                  dangerouslySetInnerHTML={{ __html: markdownit().render(message.content) }}
                ></div>
                {/* コピー用ボタンを追加 */}
                <div className="MessageActions">
                  <button onClick={() => handleCopyToClipboard(message)}>Copy to Clipboard</button>
                </div>
                {/* メッセージの文字数を表示 */}
                <div className='status'>
                  文字数: {message.content.length}
                  ,
                  トークン数: {countTokens(message.content)}
                </div>
              </>
            ))}
          </div>
          {/* リアルタイムのメッセージを表示 */}
          <div dangerouslySetInnerHTML={{__html: response}}></div>
          <br/>
          {error && (
            <div className="error">{error}</div>
          )}
          <div className='user-input-actions'>
            <button onClick={() => handleSend('Continue')}>Continue</button>
            <button onClick={() => handleSend('次の文章を日本語に翻訳して:\n\n' + userInput)}>日本語に翻訳</button>
            <button onClick={() => handleSend('次の文章を要約して:\n\n' + userInput)}>要約</button>
          </div>
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message here..."
            onKeyDown={handleKeyPress}
            rows={5}
          />
          <div className='userInputStatus'>
            文字数: {userInput.length}
            ,
            質問トークン数: {userInputTokenCount} / 2048
            ,
            会話トークン数: {messagesTokenCount} / 2048
          </div>
          <div className='note'>
            Ctrl + Enterで送信
          </div>
          <div className='settings'>
            <div>VoiceVox設定</div>
            <label>
              <input type="checkbox" checked={playVoiceUserInput} onChange={handlePlayVoiceUserInputChange} />
              Play UserInput
              (Speaker ID:<input type="text" className='speaker-id' value={userInputSpeakerId} onChange={(e) => setUserInputSpeakerId(e.target.value)} maxLength={2} />)
            </label>
            <br/>
            <label>
              <input type="checkbox" checked={playVoiceResponse} onChange={handlePlayVoiceResponseChange} />
              Play Response
              (Speaker ID:<input type="text" className='speaker-id' value={responseSpeakerId} onChange={(e) => setResponseSpeakerId(e.target.value)} maxLength={2} />)
            </label>
            <br/>
            <label>
              <input type="checkbox" checked={playInMiddle} onChange={(e) => setPlayInMiddle(e.target.checked)} />
              Play In middle
            </label>
            <br/>
            <fieldset>
              <legend>Conversations</legend>
              <label>
                <input type="checkbox" checked={playConversation} onChange={handlePlayConversationChange} />
                Play Conversation
              </label>
              <button onClick={() => setConversations(prev => [...prev, {name: '', speakerId: ''}])}>Add Conversation</button>
              <button onClick={() => setConversations(prev => prev.slice(0, -1))}>Remove Conversation</button>
              {conversations.map((conversation, index) => (
                <div key={index}>
                  発言者<input type="text" value={conversation.name} onChange={(e) => {setConversations(prev => {const ary = [...prev];ary[index].name = e.target.value; saveConversations(ary); return ary;})}} />
                  Speaker ID:<input type="text" className='speaker-id' value={conversation.speakerId} onChange={(e) => {setConversations(prev => {const ary = [...prev]; ary[index].speakerId = e.target.value; saveConversations(ary); return ary})}} maxLength={2} />
                </div>
              ))}
            </fieldset>
          </div>
          <div className="messagesEnd" ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

export default App;
