from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "edustream_db"

client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]

# Collections
videos_collection = database.get_collection("videos")
users_collection = database.get_collection("users")
history_collection = database.get_collection("history")
chat_history_collection = database.get_collection("chat_history")
submissions_collection = database.get_collection("submissions")

# Create indexes for production query performance
async def ensure_indexes():
    """Create database indexes for fast lookups. Safe to call multiple times."""
    await videos_collection.create_index("video_id", unique=True)
    await history_collection.create_index([("user_id", 1), ("video_id", 1)])
    await history_collection.create_index([("user_id", 1), ("timestamp", -1)])
    await chat_history_collection.create_index([("user_id", 1), ("video_id", 1), ("timestamp", 1)])
    await submissions_collection.create_index([("user_id", 1), ("video_id", 1), ("challenge_id", 1)])
    await users_collection.create_index("user_id", unique=True)
    # Embeddings collection (vector storage)
    embeddings_collection = database.get_collection("embeddings")
    await embeddings_collection.create_index("video_id")

async def get_video_by_id(video_id: str):
    print(f"[DB] Fetching video metadata | ID: {video_id}")
    return await videos_collection.find_one({"video_id": video_id})

async def save_video_metadata(video_id: str, data: dict):
    print(f"[DB] Saving video metadata | ID: {video_id}")
    return await videos_collection.update_one(
        {"video_id": video_id},
        {"$set": data},
        upsert=True
    )

async def get_user_history(user_id: str):
    return await history_collection.find({"user_id": user_id}).sort("timestamp", -1).to_list(100)

async def add_to_history(user_id: str, video_id: str, title: str, url: str, thumbnail: str = "", duration: str = "", content_type: str = "video"):
    from datetime import datetime
    print(f"[DB] Adding to history | User: {user_id} | {content_type.capitalize()}: {video_id}")
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

async def get_chat_history(user_id: str, video_id: str):
    print(f"[DB] Fetching chat history | User: {user_id} | Video: {video_id}")
    return await chat_history_collection.find({"user_id": user_id, "video_id": video_id}).sort("timestamp", 1).to_list(100)

async def add_chat_message(user_id: str, video_id: str, role: str, content: str):
    from datetime import datetime
    print(f"[DB] Adding chat message | User: {user_id} | Video: {video_id} | Role: {role}")
    return await chat_history_collection.insert_one({
        "user_id": user_id,
        "video_id": video_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now()
    })

async def get_user_profile(user_id: str):
    return await users_collection.find_one({"user_id": user_id})

async def update_user_profile(user_id: str, profile_data: dict):
    return await users_collection.update_one(
        {"user_id": user_id},
        {"$set": profile_data},
        upsert=True
    )

async def get_submissions(user_id: str, video_id: str, challenge_id: str):
    print(f"[DB] Fetching submissions | User: {user_id} | Video: {video_id} | Challenge: {challenge_id}")
    return await submissions_collection.find({
        "user_id": user_id, 
        "video_id": video_id, 
        "challenge_id": challenge_id
    }).sort("timestamp", -1).to_list(50)

async def add_submission(user_id: str, video_id: str, challenge_id: str, submission_data: dict):
    from datetime import datetime
    print(f"[DB] Adding submission | User: {user_id} | Challenge: {challenge_id}")
    submission_data.update({
        "user_id": user_id,
        "video_id": video_id,
        "challenge_id": challenge_id,
        "timestamp": datetime.now()
    })
    return await submissions_collection.insert_one(submission_data)
