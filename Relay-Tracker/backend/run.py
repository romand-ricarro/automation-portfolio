import os
import sys

# Add the current directory to sys.path so 'api' can be found
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

print("🚀 Launching Relay API...")
from api.index import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
