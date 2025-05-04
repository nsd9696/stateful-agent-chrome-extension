# AI Agent Chrome Extension

This Chrome extension provides an AI-powered text generation feature that works with any text input field on web pages. It uses ChromaDB for vector storage and GPT-4 for text generation.

## Features

- Automatically detects text input fields and textareas
- Shows a "Generate" button next to focused input fields
- Uses page context to generate relevant text
- Integrates with local ChromaDB for vector storage
- Uses GPT-4 for intelligent text generation

## Setup

### Backend Server

1. Navigate to the server directory:

```bash
cd server
```

2. Create a virtual environment and activate it:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up your OpenAI API key:
   Create a `.env` file in the server directory and add:

```
OPENAI_API_KEY=your_api_key_here
```

5. Start the server:

```bash
python main.py
```

### Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory

## Usage

1. Make sure the backend server is running on `localhost:8080`
2. Click on any text input field on any webpage
3. A "Generate" button will appear next to the input field
4. Click the button to generate context-aware text for the input field

## Technical Details

- The extension uses MutationObserver to detect dynamically added input fields
- ChromaDB is used for storing and retrieving relevant context vectors
- The backend server uses FastAPI for handling requests
- CORS is enabled to allow communication between the extension and local server

## Requirements

- Python 3.7+
- Chrome browser
- OpenAI API key
- Local storage for ChromaDB
