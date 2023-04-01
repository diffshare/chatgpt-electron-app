import React, { useEffect, useState } from 'react';
import './App.css';
import {ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi} from 'openai';
import markdownit from 'markdown-it';
import { ipcRenderer } from 'electron';

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

function App() {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [apiKey, setApiKey] = useState('');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);

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
      max_tokens: 1500,
      n: 1,
      temperature: 0.8,
      stream: true,
    };

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
      const reader = response.body?.getReader();

      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const delta = decodeResponse(value)
        fullText += delta

        setResponse(markdownit().render(fullText));
      }

      setResponse('');
      setMessages((prevMessages) => {
        // メッセージ履歴を更新
        const updatedMessages = [...prevMessages, { role: 'assistant', content: fullText } as Message];
        // メッセージ履歴をローカルストレージに保存
        localStorage.setItem('messageHistory', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
    } catch (error) {
      console.error(error);
      setResponse('Error: Failed to get a response from ChatGPT.');
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
  const handleCopyToClipboard = (message: Message) => {
    window.clipboard.writeText(message.content);
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
                <button onClick={() => handleCopyToClipboard(message)}>Copy to Clipboard</button>
              </>
            ))}
          </div>
          {/* リアルタイムのメッセージを表示 */}
          <div dangerouslySetInnerHTML={{__html: response}}></div>
          <br/>
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message here..."
            onKeyUp={handleKeyPress}
            rows={5}
          />
          <br/>
          Ctrl + Enterで送信
        </>
      )}
    </div>
  );
}

export default App;
