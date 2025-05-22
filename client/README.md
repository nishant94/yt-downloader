# YouTube Video Downloader Frontend (React 19 + Vite)

This is a React 19 (Vite) frontend for interacting with the YouTube video downloader backend.

## Features
- Input a YouTube video ID
- Fetch and display video metadata using `/youtube/metadata`
- Download/stream the video using `/youtube/download`

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure
- `src/App.jsx`: Main React component (UI for metadata fetch & download)
- `.github/copilot-instructions.md`: Copilot custom instructions
- `.vscode/tasks.json`: VS Code task for running the dev server

## Backend API
- `/youtube/metadata?videoId=...` (GET): Fetch YouTube video metadata
- `/youtube/download?videoId=...` (GET): Download/stream YouTube video

---

Replace the backend URL in the frontend code if your backend is running on a different host/port.
