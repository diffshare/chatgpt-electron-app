import React, { useEffect, useState } from 'react';
import './App.css';
import {ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi} from 'openai';
import markdownit from 'markdown-it';

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
  const [apiKey, setApiKey] = useState('');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    const storedApiKey = localStorage.getItem('apiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('apiKey', newApiKey);
  };

  const handleSend = async () => {
    if (!userInput || !apiKey) return;

    const configuration = new Configuration({
      apiKey
    });
    const openai = new OpenAIApi(configuration);

    const requestOptions: CreateChatCompletionRequest = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: ChatCompletionRequestMessageRoleEnum.User,
          content: `User: ${userInput}\nAssistant:`,
        }
      ],
      max_tokens: 150,
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

      if (!response.body) throw new Error('No response body');
      const reader = response.body?.getReader();

      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const delta = decodeResponse(value)
        fullText += delta

        setResponse(fullText);
      }

      // for await (const message of streamCompletion(result))
      // const generatedResponse = result?.data.choices[0].message?.content;
      // setResponse(`${generatedResponse && markdownit().render(generatedResponse)}`);
    } catch (error) {
      console.error(error);
      setResponse('Error: Failed to get a response from ChatGPT.');
    }

    setUserInput('');
  };

  return (
    <div className="App">
      <h1>ChatGPT Electron App</h1>
      <label htmlFor="api-key">API Key:</label>
      <input
        id="api-key"
        type="text"
        value={apiKey}
        onChange={handleApiKeyChange}
        placeholder="Enter your OpenAI API key"
      />
      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your message here..."
      />
      <button onClick={handleSend}>Send</button>
      <div dangerouslySetInnerHTML={{__html: response}}></div>
    </div>
  );
}

export default App;
