from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "edustream_db"

try:
    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    database = client[DATABASE_NAME]
    logger.info(f"MongoDB client initialized: {MONGODB_URL}")
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}", exc_info=True)
    raise

# Collections
videos_collection = database.get_collection("videos")
users_collection = database.get_collection("users")
history_collection = database.get_collection("history")
chat_history_collection = database.get_collection("chat_history")
submissions_collection = database.get_collection("submissions")

# Create indexes for production query performance
async def ensure_indexes():
    """Create database indexes for fast lookups. Safe to call multiple times."""
    try:
        logger.info("Creating database indexes...")
        
        await videos_collection.create_index("video_id", unique=True)
        await history_collection.create_index([("user_id", 1), ("video_id", 1)])
        await history_collection.create_index([("user_id", 1), ("timestamp", -1)])
        await chat_history_collection.create_index([("user_id", 1), ("video_id", 1), ("timestamp", 1)])
        await submissions_collection.create_index([("user_id", 1), ("video_id", 1), ("challenge_id", 1)])
        await users_collection.create_index("user_id", unique=True)
        
        # Embeddings collection (vector storage)
        embeddings_collection = database.get_collection("embeddings")
        await embeddings_collection.create_index("video_id")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}", exc_info=True)
        raise

async def get_video_by_id(video_id: str):
    """Retrieve video metadata by ID."""
    try:
        logger.debug(f"Fetching video metadata | ID: {video_id}")
        result = await videos_collection.find_one({"video_id": video_id})
        return result
    except Exception as e:
        logger.error(f"Error fetching video {video_id}: {e}", exc_info=True)
        return None

async def save_video_metadata(video_id: str, data: dict):
    """Save or update video metadata."""
    try:
        logger.debug(f"Saving video metadata | ID: {video_id}")
        return await videos_collection.update_one(
            {"video_id": video_id},
            {"$set": data},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error saving video metadata {video_id}: {e}", exc_info=True)
        return None

async def get_user_history(user_id: str):
    """Retrieve user's video history."""
    try:
        logger.debug(f"Fetching user history | User: {user_id}")
        return await history_collection.find({"user_id": user_id}).sort("timestamp", -1).to_list(100)
    except Exception as e:
        logger.error(f"Error fetching history for user {user_id}: {e}", exc_info=True)
        return []

async def add_to_history(user_id: str, video_id: str, title: str, url: str, thumbnail: str = "", duration: str = "", content_type: str = "video"):
    """Add or update item in user's history."""
    try:
        logger.debug(f"Adding to history | User: {user_id} | {content_type.capitalize()}: {video_id}")
        return await history_collection.update_one(
            {"user_id": user_id, "video_id": video_id},
            {"$set": {
                "title": title,
                "url": url,
                "thumbnail": thumbnail,
                "duration": duration,
                "content_type": content_type,
                "timestamp": datetime.now()
            }},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error adding to history: {e}", exc_info=True)
        return None

async def get_chat_history(user_id: str, video_id: str):
    """Retrieve chat history for a user and video."""
    try:
        logger.debug(f"Fetching chat history | User: {user_id} | Video: {video_id}")
        return await chat_history_collection.find({"user_id": user_id, "video_id": video_id}).sort("timestamp", 1).to_list(100)
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}", exc_info=True)
        return []

async def add_chat_message(user_id: str, video_id: str, role: str, content: str):
    """Add a message to the chat history."""
    try:
        logger.debug(f"Adding chat message | User: {user_id} | Video: {video_id} | Role: {role}")
        return await chat_history_collection.insert_one({
            "user_id": user_id,
            "video_id": video_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now()
        })
    except Exception as e:
        logger.error(f"Error adding chat message: {e}", exc_info=True)
        return None

async def get_user_profile(user_id: str):
    """Retrieve user profile."""
    try:
        return await users_collection.find_one({"user_id": user_id})
    except Exception as e:
        logger.error(f"Error fetching user profile {user_id}: {e}", exc_info=True)
        return None

async def update_user_profile(user_id: str, profile_data: dict):
    """Update user profile."""
    try:
        logger.debug(f"Updating user profile | User: {user_id}")
        return await users_collection.update_one(
            {"user_id": user_id},
            {"$set": profile_data},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error updating user profile {user_id}: {e}", exc_info=True)
        return None

async def get_submissions(user_id: str, video_id: str, challenge_id: str):
    """Retrieve code submissions for a challenge."""
    try:
        logger.debug(f"Fetching submissions | User: {user_id} | Video: {video_id} | Challenge: {challenge_id}")
        return await submissions_collection.find({
            "user_id": user_id, 
            "video_id": video_id, 
            "challenge_id": challenge_id
        }).sort("timestamp", -1).to_list(50)
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}", exc_info=True)
        return []

async def add_submission(user_id: str, video_id: str, challenge_id: str, submission_data: dict):
    """Add a code submission."""
    try:
        logger.debug(f"Adding submission | User: {user_id} | Challenge: {challenge_id}")
        submission_data.update({
            "user_id": user_id,
            "video_id": video_id,
            "challenge_id": challenge_id,
            "timestamp": datetime.now()
        })
        return await submissions_collection.insert_one(submission_data)
    except Exception as e:
        logger.error(f"Error adding submission: {e}", exc_info=True)
        return None
