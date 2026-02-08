"""Meridian Engine Configuration"""
import os

DATA_PATH = os.environ.get("MERIDIAN_DATA", "SupportMind_Final_Data.xlsx")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
GAP_SIMILARITY_THRESHOLD = 0.40
TOP_K_DEFAULT = 5
TFIDF_MAX_FEATURES = 30000
EVAL_HIT_K_VALUES = [1, 3, 5, 10]
