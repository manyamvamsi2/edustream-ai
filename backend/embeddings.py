from sentence_transformers import SentenceTransformer

# Load embedding model globally
print("Loading sentence-transformer model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates vector embeddings for a list of text chunks using a local SentenceTransformer model.
    """
    try:
        embeddings = embedding_model.encode(texts)
        return embeddings.tolist()
    except Exception as e:
        raise Exception(f"Failed to generate embeddings: {str(e)}")
