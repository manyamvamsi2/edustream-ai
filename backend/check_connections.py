import os
import asyncio
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check_mongodb():
    uri = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    print(f"Checking MongoDB at {uri}...")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
        await client.admin.command('ping')
        print("✅ MongoDB is CONNECTED.")
    except Exception as e:
        print(f"❌ MongoDB is NOT CONNECTED: {e}")

def check_groq():
    api_key = os.getenv("GROQ_API_KEY")
    print(f"Checking Groq API...")
    if not api_key:
        print("❌ GROQ_API_KEY is MISSING in .env.")
        return
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5
    }
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code == 200:
            print("✅ Groq API is CONNECTED.")
        else:
            print(f"❌ Groq API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Groq API is NOT CONNECTED: {e}")

async def main():
    await check_mongodb()
    check_groq()

if __name__ == "__main__":
    asyncio.run(main())
