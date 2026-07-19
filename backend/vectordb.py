import numpy as np
import logging
from typing import List, Dict, Any, Optional
from embeddings import generate_embeddings
from database import database

logger = logging.getLogger(__name__)

# MongoDB collection for vector embeddings
embeddings_collection = database.get_collection("embeddings")

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    try:
        a = np.array(a)
        b = np.array(b)
        
        # Handle edge cases
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(np.dot(a, b) / (norm_a * norm_b))
    except Exception as e:
        logger.error(f"Error computing cosine similarity: {e}", exc_info=True)
        return 0.0

async def store_chunks_in_db(video_id: str, chunks: List[Dict[str, Any]]) -> bool:
    """
    Stores document chunks and their embeddings in MongoDB.
    Replaces ChromaDB with MongoDB for cloud persistence.
    Returns True on success, False otherwise.
    """
    try:
        if not chunks:
            logger.warning(f"No chunks to store for video {video_id}")
            return False
        
        texts = [chunk.get("text", "") for chunk in chunks]
        
        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = generate_embeddings(texts)
        
        if not embeddings or len(embeddings) != len(chunks):
            logger.error(f"Embedding generation failed for video {video_id}")
            return False
        
        # Delete existing chunks for this video (in case of re-processing)
        await embeddings_collection.delete_many({"video_id": video_id})
        
        # Prepare documents
        docs = []
        for i, chunk in enumerate(chunks):
            docs.append({
                "video_id": video_id,
                "chunk_index": i,
                "text": chunk.get("text", ""),
                "start": chunk.get("start"),
                "end": chunk.get("end"),
                "embedding": embeddings[i]
            })
        
        if docs:
            result = await embeddings_collection.insert_many(docs)
            logger.info(f"Stored {len(docs)} chunks in MongoDB for video: {video_id}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error storing chunks for video {video_id}: {e}", exc_info=True)
        return False

async def search_chunks(video_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Searches MongoDB for chunks most relevant to the query using cosine similarity.
    Returns list of most relevant chunks.
    """
    try:
        if not query or not query.strip():
            logger.warning(f"Empty query for video {video_id}")
            return []
        
        logger.info(f"Searching chunks for video {video_id} with query: {query[:50]}...")
        
        # Generate embedding for query
        query_embeddings = generate_embeddings([query])
        if not query_embeddings or not query_embeddings[0]:
            logger.error(f"Failed to generate query embedding for video {video_id}")
            return []
        
        query_embedding = query_embeddings[0]
        
        # Fetch all chunks for this video
        cursor = embeddings_collection.find({"video_id": video_id})
        all_chunks = await cursor.to_list(length=None)
        
        if not all_chunks:
            logger.warning(f"No chunks found for video: {video_id}")
            return []
        
        # Compute similarity scores
        scored = []
        for chunk in all_chunks:
            try:
                score = cosine_similarity(query_embedding, chunk.get("embedding", []))
                scored.append((score, chunk))
            except Exception as e:
                logger.warning(f"Error computing similarity for chunk {chunk.get('chunk_index')}: {e}")
                continue
        
        # Sort by similarity (highest first) and take top_k
        scored.sort(key=lambda x: x[0], reverse=True)
        top_results = scored[:top_k]
        
        logger.info(f"Search complete. Found {len(top_results)} relevant chunks for video {video_id}")
        
        return [
            {
                "text": chunk.get("text", ""),
                "start": chunk.get("start"),
                "end": chunk.get("end")
            }
            for _, chunk in top_results
        ]
        
    except Exception as e:
        logger.error(f"Error searching chunks for video {video_id}: {e}", exc_info=True)
        return []
