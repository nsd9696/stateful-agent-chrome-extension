"""
FastAPI backend server for Stateful Agent Chrome Extension.

This server provides:
1. Chat API with LLM integration
2. File management for vector storage
3. API key configuration
"""

# ================ IMPORTS ================

# Standard library imports
import asyncio
import concurrent.futures
import datetime
import json
import os
import shutil
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any, List, Optional

# FastAPI related imports
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Environment and config imports
import dotenv
import nest_asyncio
import openai

# LangChain imports
from langchain import hub
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.memory import ConversationSummaryMemory
from langchain_core.documents import Document
from langchain_core.prompts import MessagesPlaceholder, ChatPromptTemplate
from langchain_openai import ChatOpenAI

# Vector database imports
import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

# File processing imports
from markitdown import MarkItDown
from langchain_text_splitters import RecursiveCharacterTextSplitter, Language

# Custom imports
from tools.query_collection import query_collection_iteration
from hyperpocket_langchain import PocketLangchain
from composio_langchain import ComposioToolSet, App

# ================ CONFIGURATION ================

# Load environment variables
dotenv.load_dotenv()

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

# ================ GLOBAL VARIABLES ================

# Global agent instance
hyperpocket_agent = None

# Data storage path
DATA_DIR = Path("../.stateful_agent/data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Initialize embedding function
embedding_function = OpenAIEmbeddingFunction(
    api_key=os.environ.get('OPENAI_API_KEY'), 
    model_name="text-embedding-3-small"
)

# Initialize OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize ChromaDB client
try:
    chroma_client = chromadb.PersistentClient(
        path=os.getenv("CHROMA_PERSIST_DIRECTORY")
    )
except Exception as e:
    print(f"Error initializing ChromaDB: {str(e)}")
    chroma_client = None

# ================ API MODELS ================

class ChatRequest(BaseModel):
    """Request model for chat interactions"""
    message: str
    context: Dict[str, str]

class DeleteFileRequest(BaseModel):
    """Request model for file deletion"""
    filename: str

class EnvUpdateRequest(BaseModel):
    """Request model for environment variable updates"""
    openai_key: Optional[str] = None
    composio_key: Optional[str] = None

class GenerateRequest(BaseModel):
    """Request model for text generation"""
    context: Dict[str, str]
    inputType: str
    inputId: str
    inputName: str
    placeholder: str

# ================ UTILITY FUNCTIONS ================

def run_in_thread(func, *args, **kwargs):
    """
    Execute a function in a separate thread with its own event loop.
    
    This helps prevent event loop conflicts when running async code in threads.
    
    Args:
        func: Function to execute
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        Result from the function execution
    """
    def wrapper():
        # Create a new event loop for this thread
        asyncio.set_event_loop(asyncio.new_event_loop())
        # Run the function and return its result
        return func(*args, **kwargs)
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(wrapper)
        return future.result()

def get_hyperpocket_agent():
    """
    Initialize an agent with the current API keys.
    
    Creates a new agent with tools from:
    - PocketLangchain
    - Composio (if API key available)
    
    Returns:
        AgentExecutor: Initialized agent ready to process queries
    """
    print("Initializing hyperpocket agent with current API keys...")
    
    # Initialize the LLM with GPT-4.1
    llm = ChatOpenAI(temperature=0, model="gpt-4.1")
    
    # Get tools from PocketLangchain
    with PocketLangchain(tools=[query_collection_iteration]) as pocket:
        tools = pocket.get_tools()
    
    # Add Composio tools if API key is available
    composio_key = os.getenv("COMPOSIO_API_KEY")
    if composio_key:
        try:
            composio_toolset = ComposioToolSet(api_key=composio_key)
            composio_integrations = composio_toolset.get_integrations()
            
            for integration in composio_integrations:
                app_name = integration.appName.upper()
                app_enum = getattr(App, app_name, None)
                if app_enum:
                    app_tools = composio_toolset.get_tools(apps=[app_enum])
                    tools.extend(app_tools)
                    
        except Exception as e:
            print(f"Error initializing Composio tools: {str(e)}")
    
    # Create the agent
    prompt = hub.pull("hwchase17/openai-functions-agent")
    agent = create_openai_functions_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    print("Agent initialized successfully!")
    return agent_executor

# ================ FILE PROCESSING ================

async def file_to_markdown(file_path: str) -> str:
    """
    Convert a file to markdown format for processing.
    
    Args:
        file_path: Path to the file to convert
        
    Returns:
        str: Markdown text representation of the file
    """
    md = MarkItDown(enable_plugins=True)
    result = md.convert(file_path)
    markdown_text = result.text_content
    markdown_text = markdown_text.replace("\t", " ")  # Replace tabs with spaces
    return markdown_text

def markdown_chunking(markdown_text: str, chunk_size: int = 1024) -> List[str]:
    """
    Split markdown text into chunks for vector database storage.
    
    Args:
        markdown_text: The markdown text to split
        chunk_size: Size of each chunk (default: 1024)
        
    Returns:
        List[str]: List of text chunks
    """
    chunk_overlap = 64  # Overlap between chunks for context preservation
    text_splitter = RecursiveCharacterTextSplitter().from_language(
        language=Language.MARKDOWN,
        chunk_size=chunk_size, 
        chunk_overlap=chunk_overlap,
    )

    chunked_document = text_splitter.create_documents([markdown_text])
    chunks = [chunk.page_content for chunk in chunked_document]
    return chunks

async def process_file(file_path: Path) -> bool:
    """
    Process a file and add its content to the vector database.
    
    Workflow:
    1. Convert file to markdown
    2. Split into chunks
    3. Store in ChromaDB collection
    
    Args:
        file_path: Path to the file to process
        
    Returns:
        bool: True if processing successful, False otherwise
    """
    if chroma_client is None:
        print(f"Skipping processing for {file_path} - ChromaDB not initialized")
        return False

    try:
        # Convert file to markdown and split into chunks
        markdown_text = await file_to_markdown(str(file_path))
        chunks = markdown_chunking(markdown_text)

        # Recreate the collection (this is a simple approach - 
        # in production you might want to update rather than recreate)
        try:
            chroma_client.delete_collection("user_data")
            print("Deleted existing user_data collection")
        except Exception:
            pass  # Collection might not exist yet

        try:
            collection = chroma_client.create_collection(
                name="user_data",
                embedding_function=embedding_function
            )
            print(f"Created fresh collection 'user_data' for processing files")
        except Exception as e:
            print(f"Error creating collection: {str(e)}")
            return False

        # Add each chunk to the collection
        for i, chunk in enumerate(chunks):
            try:
                chunk_id = f"{file_path.stem}_{i}"
                metadata = {
                    "source": str(file_path),
                    "chunk_id": i,
                    "page": 0,
                    "filename": file_path.name
                }
                collection.add(
                    documents=[chunk],
                    metadatas=[metadata],
                    ids=[chunk_id]
                )
                print(f"Added chunk {i} from {file_path.name}")
            except Exception as chunk_error:
                print(f"Error adding chunk {i} from {file_path.name}: {str(chunk_error)}")

        print(f"Successfully processed {file_path}")
        return True

    except Exception as e:
        print(f"Error processing file {file_path}: {str(e)}")
        return False

# ================ FASTAPI APP ================

# Create FastAPI app
app = FastAPI(
    title="Stateful Agent API",
    description="Backend API for the Stateful Agent Chrome Extension",
    version="1.0.0"
)

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, limit this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================ API ENDPOINTS ================

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Process a chat message using the AI agent.
    
    Args:
        request: Chat request containing message and context
        
    Returns:
        dict: Agent's response
    """
    try:
        def run_agent(query):
            try:
                global hyperpocket_agent
                
                # Lazy initialization of agent if not already done
                if hyperpocket_agent is None:
                    hyperpocket_agent = get_hyperpocket_agent()
                    
                # Process the query with the agent
                result = hyperpocket_agent.invoke({"input": query})
                return result
            except Exception as e:
                print(f"Agent execution error: {str(e)}")
                return {"output": f"Error processing your request: {str(e)}"}
        
        # Execute in a separate thread to avoid blocking the API
        response = run_in_thread(run_agent, request.message)
        return {
            "response": response.get('output', "I'm sorry, I couldn't generate a response.")
        }
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return {"response": "An error occurred while processing your request."}

@app.get("/list_files")
async def list_files():
    """
    List all files in the data directory.
    
    Returns:
        dict: List of files with metadata (name, size, modified date)
    """
    try:
        files = []
        for file_path in DATA_DIR.glob("*"):
            if file_path.is_file():
                stats = file_path.stat()
                files.append({
                    "name": file_path.name,
                    "size": stats.st_size,
                    "modified": datetime.datetime.fromtimestamp(stats.st_mtime).isoformat()
                })
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_files")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload and process multiple files.
    
    Args:
        files: List of files to upload
        
    Returns:
        dict: Upload status and list of uploaded files
    """
    try:
        uploaded_files = []
        for file in files:
            # Save file to data directory
            file_path = DATA_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process file and add to vector database
            await process_file(file_path)
            uploaded_files.append(file.filename)
        
        return {
            "success": True,
            "message": f"Successfully uploaded and processed {len(uploaded_files)} files",
            "files": uploaded_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete_file")
async def delete_file(request: DeleteFileRequest):
    """
    Delete a file from the data directory.
    
    Args:
        request: Delete request with filename
        
    Returns:
        dict: Deletion status
    """
    try:
        file_path = DATA_DIR / request.filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File {request.filename} not found")
        
        # Delete the physical file
        file_path.unlink()
        
        # Remove file data from vector database
        try:
            collection = chroma_client.get_collection(name="user_data")
            # In a production system, you'd want to delete only the chunks from this file
            # currently this is handled by recreating the collection on upload
        except Exception as e:
            print(f"Error removing file from ChromaDB: {str(e)}")
        
        return {"success": True, "message": f"Successfully deleted {request.filename}"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_env")
async def get_env():
    """
    Get environment variable status without exposing keys.
    
    Returns:
        dict: Status of API keys (existence only, not values)
    """
    try:
        dotenv_path = Path('.env')
        env_exists = False
        openai_exists = False
        composio_exists = False
        
        if dotenv_path.exists():
            env_exists = True
            with open(dotenv_path, 'r') as file:
                content = file.read()
                openai_exists = 'OPENAI_API_KEY=' in content
                composio_exists = 'COMPOSIO_API_KEY=' in content
        
        return {
            "success": True,
            "env_exists": env_exists,
            "openai_key": openai_exists,
            "composio_key": composio_exists
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/update_env")
async def update_env(request: EnvUpdateRequest):
    """
    Update environment variables and reinitialize agent if needed.
    
    Args:
        request: Environment update request with API keys
        
    Returns:
        dict: Update status
    """
    try:
        dotenv_path = Path('.env')
        restart_agent = False
        
        # Create or read existing .env file
        env_vars = {}
        if dotenv_path.exists():
            # Load existing variables
            with open(dotenv_path, 'r') as file:
                for line in file:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key] = value
        
        # Update values if provided
        if request.openai_key:
            if "OPENAI_API_KEY" not in env_vars or env_vars["OPENAI_API_KEY"] != request.openai_key:
                restart_agent = True
            env_vars["OPENAI_API_KEY"] = request.openai_key
        
        if request.composio_key:
            if "COMPOSIO_API_KEY" not in env_vars or env_vars["COMPOSIO_API_KEY"] != request.composio_key:
                restart_agent = True
            env_vars["COMPOSIO_API_KEY"] = request.composio_key
        
        # Write back to .env file
        with open(dotenv_path, 'w') as file:
            for key, value in env_vars.items():
                file.write(f"{key}={value}\n")
        
        # Reload environment variables
        dotenv.load_dotenv(override=True)
        
        # Update keys in current process
        if request.openai_key:
            openai.api_key = request.openai_key
            os.environ["OPENAI_API_KEY"] = request.openai_key
            
            # Update embedding function
            global embedding_function
            embedding_function = OpenAIEmbeddingFunction(
                api_key=request.openai_key, 
                model_name="text-embedding-3-small"
            )
        
        if request.composio_key:
            os.environ["COMPOSIO_API_KEY"] = request.composio_key
        
        # Reinitialize agent if needed
        if restart_agent:
            print("API keys changed - Reinitializing agent...")
            
            def reinit_agent():
                return get_hyperpocket_agent()
            
            global hyperpocket_agent
            hyperpocket_agent = run_in_thread(reinit_agent)
            print("Agent reinitialized with new API keys!")
        
        return {"success": True}
    except Exception as e:
        print(f"Error updating environment: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/reinitialize_agent")
async def reinitialize_agent():
    """
    Manually reinitialize the agent.
    
    Returns:
        dict: Reinitialization status
    """
    try:
        def reinit_agent():
            return get_hyperpocket_agent()
        
        global hyperpocket_agent
        hyperpocket_agent = run_in_thread(reinit_agent)
        
        return {"success": True, "message": "Agent reinitialized successfully"}
    except Exception as e:
        print(f"Error reinitializing agent: {str(e)}")
        return {"success": False, "error": str(e)}

# ================ SERVER STARTUP ================

if __name__ == "__main__":
    try:
        import uvicorn
        
        # Initialize agent on startup
        print("Initializing agent on startup...")
        hyperpocket_agent = run_in_thread(get_hyperpocket_agent)
        
        # Start the server
        uvicorn.run(app, host="0.0.0.0", port=8080)
    except ImportError:
        print("Warning: Uvicorn not installed. Please run 'pip install -r requirements.txt'")
        print("Running the server manually with: uvicorn main:app --host 0.0.0.0 --port 8080") 