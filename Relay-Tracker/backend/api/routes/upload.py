"""Upload Routes.

Provides endpoints for file upload signing using R2/S3.
"""

from flask import Blueprint, jsonify, request

from ..utils.storage import generate_presigned_url

upload_bp = Blueprint("upload", __name__, url_prefix="/api/upload")


@upload_bp.route("/sign", methods=["POST"])
def sign_upload():
    """Generate a presigned URL for file upload.

    Request Body:
        filename: Original filename.
        content_type: MIME type of the file.

    Returns:
        JSON with upload_url, public_url, and key.
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    filename = data.get("filename")
    content_type = data.get("content_type", "application/octet-stream")

    if not filename:
        return jsonify({"error": "filename is required"}), 400

    try:
        result = generate_presigned_url(filename, content_type)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to generate upload URL: {str(e)}"}), 500
