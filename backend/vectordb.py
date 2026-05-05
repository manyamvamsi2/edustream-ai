import numpy as np
from embeddings import generate_embeddings
from database import database

# MongoDB collection for vector embeddings
embeddings_collection = database.get_collection("embeddings")

def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

async def store_chunks_in_db(video_id: str, chunks: list):
    """
    Stores document chunks and their embeddings in MongoDB.
    Replaces ChromaDB with MongoDB for cloud persistence.
    """
    texts = [chunk["text"] for chunk in chunks]
    
    print(f"[VECTOR DB] Generating embeddings for {len(texts)} chunks...")
    embeddings = generate_embeddings(texts)
    
    # Delete existing chunks for this video (in case of re-processing)
    await embeddings_collection.delete_many({"video_id": video_id})
    
    # Prepare documents
    docs = []
    for i, chunk in enumerate(chunks):
        docs.append({
            "video_id": video_id,
            "chunk_index": i,
            "text": chunk["text"],
            "start": chunk.get("start"),
            "end": chunk.get("end"),
            "embedding": embeddings[i]
        })
    
    if docs:
        await embeddings_collection.insert_many(docs)
        print(f"[VECTOR DB] Stored {len(docs)} chunks in MongoDB (video: {video_id})")

async def search_chunks(video_id: str, query: str, top_k: int = 5) -> list:
    """
    Searches MongoDB for chunks most relevant to the query using cosine similarity.
    """
    query_embedding = generate_embeddings([query])[0]
    
    # Fetch all chunks for this video
    cursor = embeddings_collection.find({"video_id": video_id})
    all_chunks = await cursor.to_list(length=None)
    
    if not all_chunks:
        print(f"[VECTOR DB] No chunks found for video: {video_id}")
        return []
    
    # Compute similarity scores
    scored = []
    for chunk in all_chunks:
        score = cosine_similarity(query_embedding, chunk["embedding"])
        scored.append((score, chunk))
    
    # Sort by similarity (highest first) and take top_k
    scored.sort(key=lambda x: x[0], reverse=True)
    top_results = scored[:top_k]
    
    print(f"[VECTOR DB] Search complete. Found {len(top_results)} results.")
    
    return [
        {
            "text": chunk["text"],
            "start": chunk.get("start"),
            "end": chunk.get("end")
        }
        for _, chunk in top_results
    ]
