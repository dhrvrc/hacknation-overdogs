"""
Meridian API Server Runner
Usage: python run_server.py
Starts the FastAPI server on port 8000.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "meridian.server.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
