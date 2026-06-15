import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Log the environment mode for debugging - DO THIS BEFORE HEAVY IMPORTS
print(f"🚀 Relay Tracker: Starting in {os.environ.get('VERCEL_ENV', 'development')} mode...")
print("📦 Loading services and routes...")

# Configure CORS
# Allow localhost for development and Vercel domains for production
def get_origins():
    frontend_url = os.getenv("FRONTEND_URL")
    vercel_url = os.getenv("VERCEL_URL")
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "https://relay-tracker.vercel.app",
        "https://relay-five-coral.vercel.app",
        "https://relay-foodstyles-staging.vercel.app",
    ]
    # Add custom frontend URL if set
    if frontend_url and frontend_url not in origins:
        origins.append(frontend_url)
    # Add Vercel domains dynamically
    if vercel_url:
        origins.append(f"https://{vercel_url}")
    
    # Also allow any subdomain of the staging/production domains
    origins.append("https://relay-foodstyles-staging.vercel.app")
    origins.append("https://relay-foodstyles.vercel.app")
    
    return origins

# Apply CORS to all routes
CORS(app, resources={r"/*": {"origins": get_origins()}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization", "X-Requested-With"])

# Register blueprints - use relative imports for Vercel compatibility
from .routes.auth import auth_bp  # noqa: E402
from .routes.issues import issues_bp  # noqa: E402
from .routes.whitelist import whitelist_bp  # noqa: E402
from .routes.upload import upload_bp  # noqa: E402

app.register_blueprint(auth_bp)
app.register_blueprint(issues_bp)
app.register_blueprint(whitelist_bp)
app.register_blueprint(upload_bp)

print("✅ Server ready!")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify the API is running."""
    return jsonify({"status": "ok", "message": "Relay API is running"})


@app.route("/", methods=["GET"])
def root():
    """Root endpoint."""
    return jsonify({
        "name": "Relay API",
        "version": "1.0.0",
        "description": "Fast track from report to resolution",
        "endpoints": {
            "health": "/api/health",
            "auth": {
                "me": "/api/auth/me",
                "verify": "/api/auth/verify",
                "logout": "/api/auth/logout",
                "preferences": "/api/auth/preferences",
                "users": "/api/auth/users",
            },
            "issues": {
                "list": "GET /api/issues",
                "get": "GET /api/issues/{key}",
                "create": "POST /api/issues",
                "update": "PUT /api/issues/{key}",
                "delete": "DELETE /api/issues/{key}",
                "comments": "POST /api/issues/{key}/comments",
                "attachments": "POST /api/issues/{key}/attachments",
                "updates": "GET /api/issues/updates",
            },
            "whitelist": {
                "list": "GET /api/whitelist",
                "add": "POST /api/whitelist",
                "remove": "DELETE /api/whitelist/{id}",
                "check": "GET /api/whitelist/check/{email}",
            },
        }
    })


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found", "message": str(error)}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error", "message": str(error)}), 500


# For local development
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
