import os
import chromadb
from embeddings import generate_embeddings

CHROMA_DB_DIR = "chroma_db_fixed"
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

# Initialize ChromaDB Local Client
client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

def get_or_create_collection(collection_name: str):
    print(f"[VECTOR DB] Getting/Creating collection: {collection_name}")
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

def store_chunks_in_db(video_id: str, chunks: list[dict]):
    """
    Stores document chunks and their embeddings in ChromaDB.
    """
    collection = get_or_create_collection(f"video_{video_id}")
    
    texts = [chunk["text"] for chunk in chunks]
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"start": chunk["start"], "end": chunk["end"]} for chunk in chunks]
    
    # Generate embeddings
    print(f"[VECTOR DB] Generating embeddings for {len(texts)} chunks...")
    embeddings = generate_embeddings(texts)
    
    print(f"[VECTOR DB] Storing chunks in ChromaDB (video_{video_id})...")
    
    collection.add(
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

def search_chunks(video_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Searches the vector database for chunks most relevant to the query.
    """
    collection = get_or_create_collection(f"video_{video_id}")
    query_embedding = generate_embeddings([query])[0]
    
    print(f"[VECTOR DB] Searching for top {top_k} similar chunks...")
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    print(f"[VECTOR DB] Search complete. Found {len(results['documents'][0]) if results['documents'] else 0} results.")
    
    formatted_results = []
    if results["documents"] and len(results["documents"]) > 0:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        for idx in range(len(docs)):
            formatted_results.append({
                "text": docs[idx],
                "start": metas[idx].get("start"),
                "end": metas[idx].get("end")
            })
            
    return formatted_results
