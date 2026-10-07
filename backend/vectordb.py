import re
import numpy as np
from rank_bm25 import BM25Okapi, BM25Plus
from embeddings import generate_embeddings
from database import database

# MongoDB collection for vector embeddings
embeddings_collection = database.get_collection("embeddings")

def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

def tokenize(text: str) -> list[str]:
    """Tokenize text into lowercase words for BM25 lexical indexing."""
    return re.findall(r'\w+', (text or "").lower())

async def store_chunks_in_db(video_id: str, chunks: list):
    """
    Stores document chunks and their embeddings in MongoDB.
    Replaces ChromaDB with MongoDB for cloud persistence.
    """
    # Delete existing chunks for this video (in case of re-processing)
    await embeddings_collection.delete_many({"video_id": video_id})

    if not chunks:
        print(f"[VECTOR DB] No chunks to store for {video_id}")
        return

    texts = [chunk["text"] for chunk in chunks]
    
    print(f"[VECTOR DB] Generating embeddings for {len(texts)} chunks...")
    embeddings = generate_embeddings(texts)
    
    # Prepare documents
    docs = []
    for i, chunk in enumerate(chunks):
        docs.append({
            "video_id": video_id,
            "chunk_index": i,
            "text": chunk["text"],
            "start": chunk.get("start"),
            "end": chunk.get("end"),
            "embedding": embeddings[i] if i < len(embeddings) else []
        })
    
    if docs:
        await embeddings_collection.insert_many(docs)
        print(f"[VECTOR DB] Stored {len(docs)} chunks in MongoDB (video: {video_id})")

def bm25_search(chunks: list, query: str) -> list[tuple[float, dict]]:
    """
    BM25 Keyword Search: scores chunks lexically based on query term frequency and IDF.
    """
    tokenized_query = tokenize(query)
    if not tokenized_query or not chunks:
        return [(0.0, c) for c in chunks]

    tokenized_corpus = [tokenize(c.get("text", "")) for c in chunks]
    try:
        bm25 = BM25Plus(tokenized_corpus)
        scores = bm25.get_scores(tokenized_query)
    except Exception as e:
        print(f"[BM25] Fallback error: {e}")
        scores = [0.0] * len(chunks)

    scored = [(float(scores[i]), chunks[i]) for i in range(len(chunks))]
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored

def semantic_vector_search(chunks: list, query_embedding: list) -> list[tuple[float, dict]]:
    """
    Semantic Vector Search: scores chunks by dense embedding cosine similarity.
    """
    scored = []
    for chunk in chunks:
        score = cosine_similarity(query_embedding, chunk.get("embedding", []))
        scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored

async def search_chunks(video_id: str, query: str, top_k: int = 5) -> list:
    """
    Hybrid Retrieval (RAG):
    1. Semantic Search (Dense Vector embeddings)
    2. Keyword Search (Sparse BM25 Okapi/Plus)
    3. Filter & Rerank (Reciprocal Rank Fusion - RRF Top-K)
    """
    # Fetch all chunks for this video / document
    cursor = embeddings_collection.find({"video_id": video_id})
    all_chunks = await cursor.to_list(length=None)
    
    if not all_chunks:
        print(f"[HYBRID RAG] No chunks found for video: {video_id}")
        return []
    
    # 1. Semantic Vector Search
    query_embedding = generate_embeddings([query])[0]
    vector_ranked = semantic_vector_search(all_chunks, query_embedding)

    # 2. Keyword Search (BM25)
    bm25_ranked = bm25_search(all_chunks, query)

    # 3. Filter & Rerank via Reciprocal Rank Fusion (RRF)
    # RRF formula: score = 1 / (60 + rank_vector) + 1 / (60 + rank_bm25)
    k_constant = 60
    rrf_scores = {}
    chunk_map = {}

    for rank, (score, chunk) in enumerate(vector_ranked):
        c_id = chunk.get("chunk_index", rank)
        chunk_map[c_id] = chunk
        rrf_scores[c_id] = rrf_scores.get(c_id, 0.0) + (1.0 / (k_constant + rank + 1))

    for rank, (score, chunk) in enumerate(bm25_ranked):
        c_id = chunk.get("chunk_index", rank)
        chunk_map[c_id] = chunk
        rrf_scores[c_id] = rrf_scores.get(c_id, 0.0) + (1.0 / (k_constant + rank + 1))

    # Sort candidates by combined RRF score
    sorted_candidates = sorted(rrf_scores.items(), key=lambda item: item[1], reverse=True)
    top_candidates = sorted_candidates[:top_k]

    print(f"[HYBRID RAG] Hybrid Search (Vector + BM25 Rerank) found {len(top_candidates)} top chunks.")

    return [
        {
            "text": chunk_map[c_id]["text"],
            "start": chunk_map[c_id].get("start"),
            "end": chunk_map[c_id].get("end"),
            "score": score
        }
        for c_id, score in top_candidates
    ]

