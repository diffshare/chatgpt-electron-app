# ChatGPT Electron App

This is a simple chat application that uses the OpenAI GPT-3.5 model to generate responses to user messages. The application is built using Electron and React.

## Usage

To use the application, follow these steps:

1. Clone this repository.
2. Install the required dependencies by running `npm install`.
3. Start the application by running `npm electron-start`.

Once the application is running, you can use it as follows:

- Press `Ctrl + Space` to show the application window.
- Type your message in the input box.
- Press `Ctrl + Enter` to send your message and get a response.

## Configuration

To use the OpenAI API, you need to set your API key. You can set your API key in the `apiKey` variable in the `App` component. Alternatively, you can enter your API key in the input box that appears when you run the application. The API key will be stored in your browser's local storage so that you don't have to enter it again next time you use the application.

## Acknowledgements

This application was built using the following technologies and libraries:

- Electron
- React
- OpenAI API
- markdown-it
- electron-builder.