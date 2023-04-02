import React, { useEffect, useState } from 'react';
import './App.css';
import {ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi} from 'openai';
import markdownit from 'markdown-it';
import { ipcRenderer } from 'electron';
import { encoding_for_model } from "@dqbd/tiktoken";

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
let tasks = Promise.resolve();
// 音声合成を行い再生するタスクをランナーに依頼する関数
const playVoice = async (text: string, speakerId: number) => {
  tasks = tasks.then(() => {
    return new Promise(async (resolve) => {
      const source = context.createBufferSource();
      source.buffer = await context.decodeAudioData(await createVoice(text, speakerId));
      source.connect(context.destination);
      source.onended = () => {resolve();};
      source.start();
    });
  });
}

const enc = encoding_for_model("gpt-3.5-turbo");

function App() {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [apiKey, setApiKey] = useState('');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [playVoiceVox, setPlayVoiceVox] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [speakerId, setSpeakerId] = useState('1');
  const [playInMiddle, setPlayInMiddle] = useState(true);
  const [userInputTokenCount, setUserInputTokenCount] = useState(0);
  const [messagesTokenCount, setMessagesTokenCount] = useState(0);

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

  const handleSend = async () => {
    if (!userInput || !apiKey) return;

    setMessages((prevMessages) => [...prevMessages, { role: 'user', content: userInput }]);

    const configuration = new Configuration({
      apiKey
    });
    const openai = new OpenAIApi(configuration);

    const requestOptions: CreateChatCompletionRequest = {
      model: 'gpt-3.5-turbo',
      messages: messages.concat({
          role: ChatCompletionRequestMessageRoleEnum.User,
          content: `${userInput}`,
      }),
      max_tokens: 2048,
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
      const re = /([^。！？]{1,}[。！？])/g;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const delta = decodeResponse(value)
        fullText += delta

        setResponse(markdownit().render(fullText));

        if (playVoiceVox && playInMiddle) {
          let match;
          while ((match = re.exec(fullText)) !== null) {
            if (spokenArray.includes(match[1])) continue;
            playVoice(match[1], parseInt(speakerId))
            console.log(match[1]);
            spokenArray.push(match[1]);
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
      playVoiceVox && !playInMiddle && playVoice(fullText, parseInt(speakerId));
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

  // VoiceVoxの再生チェックをローカルストレージから読み込む
  useEffect(() => {
    localStorage.getItem('playVoiceVox') === 'true' && setPlayVoiceVox(true);
  }, []);
  // VoiceVoxを再生する
  const handlePlayVoiceVoxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayVoiceVox(e.target.checked);
    localStorage.setItem('playVoiceVox', e.target.checked.toString());
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
              </>
            ))}
          </div>
          {/* リアルタイムのメッセージを表示 */}
          <div dangerouslySetInnerHTML={{__html: response}}></div>
          <br/>
          {error && (
            <div className="error">{error}</div>
          )}
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message here..."
            onKeyUp={handleKeyPress}
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
            <label>
              <input type="checkbox" checked={playVoiceVox} onChange={handlePlayVoiceVoxChange} />
              Play VoiceVox            
              (Speaker ID:<input type="text" id='speaker-id' value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} />)
            </label>
            <label>
              <input type="checkbox" checked={playInMiddle} onChange={(e) => setPlayInMiddle(e.target.checked)} />
              Play In middle
            </label>
          </div>
          <div className="messagesEnd" ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

export default App;
