import asyncio
import json
from database import videos_collection

async def run():
    doc = await videos_collection.find_one(sort=[('_id', -1)])
    if doc:
        print(json.dumps({"url": doc.get("url"), "content_type": doc.get("content_type")}))
    else:
        print("None")

if __name__ == "__main__":
    asyncio.run(run())
