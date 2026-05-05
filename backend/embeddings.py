from sentence_transformers import SentenceTransformer

# Global variable to hold the model instance
_embedding_model = None

def get_embedding_model():
    """Lazy-loader for the embedding model."""
    global _embedding_model
    if _embedding_model is None:
        print("Loading sentence-transformer model (MiniLM-L6-v2)...")
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedding_model

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates vector embeddings using a local SentenceTransformer model.
    Model is lazy-loaded to save RAM on startup.
    """
    try:
        model = get_embedding_model()
        embeddings = model.encode(texts)
        return embeddings.tolist()
    except Exception as e:
        raise Exception(f"Failed to generate embeddings: {str(e)}")
