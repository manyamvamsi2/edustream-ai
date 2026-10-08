import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

is_cloudinary_configured = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

if is_cloudinary_configured:
    try:
        import cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        logger.info("Cloudinary storage configured successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Cloudinary: {e}")
        is_cloudinary_configured = False

def upload_file_to_cloudinary(file_path: str, public_id: Optional[str] = None, resource_type: str = "auto") -> Optional[str]:
    """
    Uploads a local media or document file to Cloudinary.
    Returns the permanent HTTPS secure_url, or None if Cloudinary is not configured.
    """
    if not is_cloudinary_configured or not os.path.exists(file_path):
        return None
    try:
        import cloudinary.uploader
        upload_params = {
            "resource_type": resource_type,
            "folder": "edustream_materials"
        }
        if public_id:
            upload_params["public_id"] = public_id
        
        result = cloudinary.uploader.upload(file_path, **upload_params)
        logger.info(f"File uploaded to Cloudinary: {result.get('secure_url')}")
        return result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed for {file_path}: {e}")
        return None
