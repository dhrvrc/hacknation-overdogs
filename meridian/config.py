"""Meridian Engine Configuration"""
import os
from pathlib import Path


def _load_dotenv():
    """Read .env file from project root if it exists."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ[key.strip()] = value.strip()


_load_dotenv()

DATA_PATH = os.environ.get("MERIDIAN_DATA", "SupportMind_Final_Data.xlsx")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-5.2"  # or "gpt-4-turbo" or "gpt-3.5-turbo"
OPENAI_EMBEDDING_MODEL = "text-embedding-3-large"
GAP_SIMILARITY_THRESHOLD = 0.60
TOP_K_DEFAULT = 5
EMBEDDING_DIMENSIONS = 3072  # text-embedding-3-large output dimensions
CHROMADB_PERSIST_DIR = os.environ.get("MERIDIAN_CHROMADB_DIR", ".chromadb_store")
EVAL_HIT_K_VALUES = [1, 3, 5, 10]
