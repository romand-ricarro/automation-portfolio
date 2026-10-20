"""Entry point for uvicorn: `uvicorn notify_api.asgi:app`. Reads settings from the environment."""

from dotenv import load_dotenv

from .main import create_app

load_dotenv()
app = create_app()
