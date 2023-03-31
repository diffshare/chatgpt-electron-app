import React, { useState } from 'react';
import './App.css';
import {ChatCompletionRequestMessageRoleEnum, Configuration, CreateChatCompletionRequest, OpenAIApi} from 'openai';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');

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
    };

    try {
      const result = await openai.createChatCompletion(requestOptions);
      const generatedResponse = result?.data.choices[0].message?.content;
      setResponse(`Assistant: ${generatedResponse}`);
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
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your OpenAI API key"
      />
      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your message here..."
      />
      <button onClick={handleSend}>Send</button>
      <div>{response}</div>
    </div>
  );
}

export default App;
