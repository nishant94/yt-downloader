from fastapi import APIRouter, Request, Response, Depends, HTTPException
from fastapi.responses import JSONResponse
from controllers.video import VideoController
from services.session import create_session, is_valid_session
import secrets
import time

router = APIRouter()
video_controller = VideoController()
SESSION_DURATION = 60 * 60  # 1 hour in seconds


@router.get("/healthz")
def healthz():
    return Response(content="ok", status_code=200)


@router.get("/get-session")
def get_session(request: Request, response: Response):
    session_id = request.cookies.get("sessionId")
    if not session_id or not is_valid_session(session_id):
        session_id = secrets.token_hex(24)
        expires_at = time.time() + SESSION_DURATION
        create_session(session_id, expires_at)
        response.set_cookie(
            key="sessionId",
            value=session_id,
            httponly=True,
            samesite="lax",
            max_age=SESSION_DURATION,
            secure=False,
        )

    headers = {
        "Access-Control-Allow-Origin": "http://localhost:5173",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    }
    return JSONResponse(content={"ok": True}, headers=headers)


def require_session(request: Request):
    return True
    session_id = request.cookies.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=401, detail="SessionId not found")
    if not is_valid_session(session_id):
        raise HTTPException(status_code=401, detail="Invalid or expired session")


@router.get("/youtube/metadata")
async def youtube_metadata(request: Request, _=Depends(require_session)):
    return await video_controller.get_youtube_metadata(request)


@router.post("/youtube/download")
async def youtube_download(request: Request, _=Depends(require_session)):
    return await video_controller.stream_youtube_video(request)
