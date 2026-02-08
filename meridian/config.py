"""Meridian Engine Configuration"""
import os

DATA_PATH = os.environ.get("MERIDIAN_DATA", "SupportMind_Final_Data.xlsx")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4"  # or "gpt-4-turbo" or "gpt-3.5-turbo"
GAP_SIMILARITY_THRESHOLD = 0.40
TOP_K_DEFAULT = 5
TFIDF_MAX_FEATURES = 30000
EVAL_HIT_K_VALUES = [1, 3, 5, 10]
