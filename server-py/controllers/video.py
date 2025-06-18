from fastapi import Request
from fastapi.responses import JSONResponse
from services.youtube import YoutubeService
from constants import STATUS, ERRORS_MESSAGES, SUCCESS_MESSAGES
from logger import logger


class VideoController:
    async def get_youtube_metadata(self, request: Request):
        video_id = request.query_params.get("videoId")
        logger.info(f"Getting metadata for videoId: {video_id}")
        if not video_id:
            logger.error(f"Missing videoId: {video_id}")
            return JSONResponse(
                status_code=400,
                content={
                    "status": STATUS["ERROR"],
                    "code": 400,
                    "error": ERRORS_MESSAGES["MISSING_VIDEO_ID"],
                },
            )
        if not isinstance(video_id, str):
            logger.error(f"Invalid videoId: {video_id}")
            return JSONResponse(
                status_code=400,
                content={
                    "status": STATUS["ERROR"],
                    "code": 400,
                    "error": ERRORS_MESSAGES["INVALID_VIDEO_ID"],
                },
            )
        try:
            logger.info(
                f"[getYoutubeMetadata] Fetching metadata for videoId: {video_id}"
            )
            metadata = YoutubeService.get_metadata(video_id)
            logger.info(
                f"[getYoutubeMetadata] Metadata fetched successfully for videoId: {video_id}"
            )
            return JSONResponse(
                status_code=200,
                content={
                    "status": STATUS["SUCCESS"],
                    "code": 200,
                    "message": SUCCESS_MESSAGES["FETCHING_METADATA"],
                    "data": metadata,
                },
            )
        except Exception as error:
            logger.error(
                f"[getYoutubeMetadata] Error fetching metadata for videoId: {video_id} - {error}"
            )
            return JSONResponse(
                status_code=400,
                content={
                    "status": STATUS["ERROR"],
                    "code": 400,
                    "error": ERRORS_MESSAGES["FETCHING_METADATA"],
                    "details": str(error),
                },
            )

    async def stream_youtube_video(self, request: Request):
        try:
            body = await request.json()
            video_id = body.get("videoId")
            itag = body.get("itag")
            audioitag = body.get("audioitag")
            format_ = body.get("format")
            type_ = body.get("type")
            info = body.get("metadata")
            if not video_id:
                return JSONResponse(
                    status_code=400, content={"error": "Video ID is required"}
                )
            title = info.get("title", video_id) if info else video_id
            # Clean title for filename
            import re

            title = re.sub(r"[^\w\s]", "", title)
            response = YoutubeService.stream_to_response(
                video_id, title, itag, audioitag, format_, type_, info
            )
            response.headers["Content-Disposition"] = (  # type: ignore
                f'attachment; filename="{title}.{"mp4" if type_ == "video" else "mp3"}"'
            )
            response.headers["Content-Type"] = "application/octet-stream"  # type: ignore
            return response
        except Exception as error:
            logger.error(f"Error streaming video: {error}")
            return JSONResponse(
                status_code=500, content={"error": "Failed to stream video"}
            )
