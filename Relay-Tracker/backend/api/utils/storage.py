"""Cloudflare R2 Storage Utilities.

Provides functions to generate presigned URLs for direct browser uploads.
Uses boto3 with S3-compatible API.
"""

import os
import uuid
import logging
from datetime import datetime

import boto3
from botocore.config import Config

logger = logging.getLogger(__name__)

# S3/R2 Client singleton
_s3_client = None


def get_s3_client():
    """Get or create the S3/R2 client singleton."""
    global _s3_client

    if _s3_client is None:
        endpoint_url = os.getenv("S3_ENDPOINT_URL")
        access_key = os.getenv("S3_ACCESS_KEY_ID")
        secret_key = os.getenv("S3_SECRET_ACCESS_KEY")
        region = os.getenv("S3_REGION", "auto")

        if not all([endpoint_url, access_key, secret_key]):
            raise ValueError(
                "Missing S3/R2 configuration. "
                "Set S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
            )

        # Crucial: R2 requires s3v4 signature version
        _s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4"),
        )

    return _s3_client


def get_bucket_name() -> str:
    """Get the S3/R2 bucket name from environment."""
    bucket = os.getenv("S3_BUCKET_NAME")
    if not bucket:
        raise ValueError("S3_BUCKET_NAME environment variable is required.")
    return bucket


def generate_presigned_url(filename: str, content_type: str, expires_in: int = 300) -> dict:
    """Generate a presigned URL for uploading a file to R2.

    Args:
        filename: Original filename (will be sanitized and made unique).
        content_type: MIME type of the file (e.g., 'image/png').
        expires_in: URL expiration time in seconds (default: 300).

    Returns:
        Dict containing:
        - upload_url: Presigned PUT URL for uploading.
        - public_url: Presigned GET URL for downloading (7-day expiry for Jira embedding).
        - key: The unique object key in the bucket.
    """
    client = get_s3_client()
    bucket = get_bucket_name()

    # Generate unique key with timestamp and UUID
    timestamp = datetime.utcnow().strftime("%Y/%m/%d")
    unique_id = uuid.uuid4().hex[:8]
    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    key = f"uploads/{timestamp}/{unique_id}_{safe_filename}"

    # Generate presigned PUT URL for upload
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )

    # Generate presigned GET URL for download/viewing (7 days expiry for Jira embedding)
    # This URL can be safely embedded in Jira descriptions
    download_expiry = 7 * 24 * 60 * 60  # 7 days in seconds
    public_url = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket,
            "Key": key,
        },
        ExpiresIn=download_expiry,
    )

    logger.info(f"Generated presigned URLs for: {key} (download expires in 7 days)")

    return {
        "upload_url": upload_url,
        "public_url": public_url,
        "key": key,
    }


def generate_presigned_download_url(key: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for downloading/viewing a file from R2.

    Args:
        key: The object key in the bucket (e.g., 'uploads/2024/01/14/abc123_file.png').
        expires_in: URL expiration time in seconds (default: 3600 = 1 hour).

    Returns:
        Presigned GET URL for downloading/viewing the file.
    """
    client = get_s3_client()
    bucket = get_bucket_name()

    download_url = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket,
            "Key": key,
        },
        ExpiresIn=expires_in,
    )

    logger.info(f"Generated presigned download URL for: {key} (expires in {expires_in}s)")
    return download_url


def extract_key_from_url(url: str) -> str | None:
    """Extract the object key from a stored R2 URL.

    Args:
        url: The stored URL, which may be:
             - Raw URL: 'https://bucket.r2.dev/uploads/2024/01/14/abc_file.png'
             - Presigned URL: 'https://bucket.r2.dev/uploads/2024/01/14/abc_file.png?X-Amz-...'

    Returns:
        The object key (e.g., 'uploads/2024/01/14/abc_file.png') or None if not extractable.
    """
    if not url:
        return None

    # The URL format is typically: https://<domain>/<key>?<query_params>
    # The key starts with 'uploads/'
    try:
        if "uploads/" in url:
            # Extract everything from 'uploads/' onwards
            key_start = url.index("uploads/")
            key_with_params = url[key_start:]
            # Remove any query parameters (for presigned URLs)
            if "?" in key_with_params:
                key_with_params = key_with_params.split("?")[0]
            return key_with_params
    except (ValueError, IndexError):
        pass

    logger.warning(f"Could not extract key from URL: {url}")
    return None


def get_presigned_url_for_attachment(url: str, expires_in: int = 3600) -> str:
    """Get a presigned download URL for an attachment given its stored URL.

    Args:
        url: The stored public URL from the database.
        expires_in: URL expiration time in seconds (default: 3600 = 1 hour).

    Returns:
        Presigned GET URL, or the original URL if key extraction fails.
    """
    key = extract_key_from_url(url)
    if key:
        try:
            return generate_presigned_download_url(key, expires_in)
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {key}: {e}")
            return url  # Fallback to original URL
    return url
