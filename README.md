# Stateful Agent Chrome Extension

A powerful Chrome extension that provides AI assistance with local knowledge management through vector database integration.

## Features

- 🤖 **AI Chat Interface**: Chat with an AI assistant directly from your browser
- 📁 **Local File Management**: Upload, view, and delete files that are used as context
- 🔍 **Vector Search**: Files are processed and stored in a vector database for semantic retrieval
- ⚙️ **API Key Management**: Easily configure OpenAI and Composio API keys in the Settings tab
- 🔄 **Stateful Interactions**: The agent maintains context throughout conversations
- 🧩 **Draggable Interface**: Position the chat window anywhere on the page

## Architecture

This project consists of two main components:

1. **Chrome Extension (Frontend)**

   - Provides a UI for interacting with the AI agent
   - Manages file uploads and displays
   - Configures API keys

2. **FastAPI Server (Backend)**
   - Processes chat messages using LangChain and OpenAI
   - Handles file storage and vector embeddings with ChromaDB
   - Manages environment configuration

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install requirements:

   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your API keys:

   ```
   OPENAI_API_KEY=your_openai_key_here
   COMPOSIO_API_KEY=your_composio_key_here
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   CHROMA_PERSIST_DIRECTORY=./.chroma
   ```

5. Start the server:
   ```bash
   python main.py
   ```

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the extension directory
4. The extension icon should appear in your toolbar

## Usage Guide

### Chat Tab

- Click on the extension icon to open the chat interface
- Type your message in the input field and press Enter or click Send
- The AI will respond based on the context provided

### Files Tab

- Upload files to provide context for the AI assistant
- Files are processed and stored in a vector database
- View, manage, and delete uploaded files

### Settings Tab

- Configure OpenAI API key (required)
- Add Composio API key (optional) for additional tools
- Click Save to update configuration and reinitialize the agent

## API Endpoints

The backend server provides the following API endpoints:

- `POST /chat`: Process chat messages
- `GET /list_files`: List all uploaded files
- `POST /upload_files`: Upload and process files
- `POST /delete_file`: Delete a file
- `GET /get_env`: Get environment configuration status
- `POST /update_env`: Update API keys
- `POST /reinitialize_agent`: Manually reinitialize the agent

## Technologies Used

- **Frontend**: JavaScript, HTML, CSS
- **Backend**: Python, FastAPI
- **AI/ML**: LangChain, OpenAI API, ChromaDB
- **File Processing**: MarkItDown
- **Extension**: Chrome Extensions API

## Development Notes

- To modify the extension icon, edit the `icon.svg` file
- The chat window can be dragged by clicking and holding the header
- API keys are stored securely in the server's `.env` file
- Files are stored in `.stateful_agent/data` directory
- Vector embeddings are stored in the ChromaDB persistence directory

## Troubleshooting

- If the server fails to start, make sure no other service is using port 8080
- If the agent fails to initialize, check your API keys in Settings
- If file processing fails, check server logs for details
