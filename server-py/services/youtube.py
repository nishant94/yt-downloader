import yt_dlp
from fastapi.responses import StreamingResponse
from typing import Any, Dict
from threading import Event


class YoutubeService:
    _progress_emitters = {}

    @staticmethod
    def get_progress_emitter(video_id: str):
        if video_id not in YoutubeService._progress_emitters:
            YoutubeService._progress_emitters[video_id] = Event()
        return YoutubeService._progress_emitters[video_id]

    @staticmethod
    def remove_progress_emitter(video_id: str):
        if video_id in YoutubeService._progress_emitters:
            del YoutubeService._progress_emitters[video_id]

    @staticmethod
    def get_metadata(video_id: str) -> Dict[str, Any]:
        url = f"https://www.youtube.com/watch?v={video_id}"
        ydl_opts = {"quiet": True, "skip_download": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {}
            formats = (
                [
                    {
                        "format_id": f["format_id"],
                        "ext": f.get("ext"),
                        "format_note": f.get("format_note"),
                        "filesize": f.get("filesize"),
                        "tbr": f.get("tbr"),
                        "url": f.get("url"),
                    }
                    for f in info["formats"]
                ]
                if "formats" in info
                else []
            )
            metadata = {
                "id": info["id"] if "id" in info else None,
                "title": info["title"] if "title" in info else None,
                "description": info["description"] if "description" in info else None,
                "category": (
                    info["categories"][0]
                    if "categories" in info and info["categories"]
                    else None
                ),
                "lengthSeconds": info["duration"] if "duration" in info else None,
                "publishDate": info["upload_date"] if "upload_date" in info else None,
                "keywords": info["tags"] if "tags" in info else None,
                "channelName": info["uploader"] if "uploader" in info else None,
                "thumbnails": info["thumbnails"] if "thumbnails" in info else None,
                "viewCount": info["view_count"] if "view_count" in info else None,
                "averageRating": (
                    info["average_rating"] if "average_rating" in info else None
                ),
                "formats": formats,
            }
            return metadata

    @staticmethod
    def stream_to_response(
        video_id: str,
        title: str,
        itag: str,
        audioitag: str,
        format: str,
        type_: str,
        info: dict,
    ):
        # This should be implemented to stream video/audio using yt_dlp if needed
        # For now, this is a stub. Actual streaming is handled in the controller.
        pass
