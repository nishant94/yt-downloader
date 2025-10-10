# YouTube Video Downloader Server (Python)

This is a FastAPI server that provides an HTTP API to download YouTube videos using yt-dlp.

## Features
- Download YouTube videos via a simple HTTP endpoint.
- Returns the video file as a response.

## Usage
1. Install uv:
   ```sh
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
2. Sync packages using uv:
   ```sh
   uv sync
   ```
3. Run the server:
   ```sh
   uvicorn main:app --reload
   ```
4. Download a video:
   - Send a GET request to `/download?url=YOUTUBE_URL`

## Example
```
curl -O -J "http://localhost:8000/download?url=https://www.youtube.com/watch?v=VIDEO_ID"
```

## Notes
- Downloaded files are stored in the `downloads/` directory.
- The server uses FastAPI and yt-dlp.
