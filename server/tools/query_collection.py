import os
import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from hyperpocket.tool import function_tool
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
from uuid import uuid4

load_dotenv()

persistent_client = chromadb.PersistentClient(
    path=os.getenv("CHROMA_PERSIST_DIRECTORY")
)

embeddings = OpenAIEmbeddings(model=os.getenv("OPENAI_EMBEDDING_MODEL"))

@function_tool
def query_collection_iteration(query: str):
    """
    Query the Chroma with iterating over all collections.
    Default K is 4.
    """
    collection_list = persistent_client.list_collections()
    collection_names = [collection.name for collection in collection_list]
    retrieved_results = []
    for collection_name in collection_names:
        vector_store = Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            client=persistent_client,
        )
        results = vector_store.similarity_search_with_score(query)
        retrieved_results.extend(results)
    
    # Sort by score
    retrieved_results.sort(key=lambda x: x[1], reverse=True)
    
    # Get top 4
    retrieved_results = retrieved_results[:4]
    
    return retrieved_results

@function_tool
def query_collection(collection_name: str, query: str):
    """
    Query the Chroma client.
    """
    collection_name = collection_name.lower()
    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=os.getenv("CHROMA_PERSIST_DIRECTORY")
    )
    results = vector_store.similarity_search(query)
    return results
