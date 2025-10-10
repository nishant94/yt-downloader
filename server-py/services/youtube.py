import json
import shutil
import tempfile
from pathlib import Path
from threading import Event
from typing import Any, Dict, Optional

import yt_dlp
from fastapi.responses import StreamingResponse


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
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:  # type: ignore
            info = ydl.extract_info(url, download=False)
            with open(f"{video_id}_info.json", "w", encoding="utf-8") as f:
                json.dump(info, f, ensure_ascii=False, indent=4)
            if not info:
                return {}

            duration_seconds = info.get("duration")
            approx_duration_ms = (
                int(duration_seconds * 1000) if duration_seconds else None
            )

            def build_format(fmt: Dict[str, Any]) -> Optional[Dict[str, Any]]:
                format_id = fmt.get("format_id")
                if not format_id:
                    return None
                try:
                    itag = int(format_id)
                except (TypeError, ValueError):
                    return None

                has_video = any(
                    fmt.get(key) not in (None, "none")
                    for key in ("vcodec", "video_ext")
                )
                has_audio = any(
                    fmt.get(key) not in (None, "none")
                    for key in ("acodec", "audio_ext")
                )

                height = fmt.get("height")
                width = fmt.get("width")
                resolution = fmt.get("resolution")
                quality_label = (
                    fmt.get("quality_label") or fmt.get("format_note") or resolution
                )
                if not quality_label and height:
                    quality_label = f"{height}p"
                elif resolution and "x" in resolution:
                    try:
                        height_from_res = int(resolution.split("x")[1])
                        quality_label = f"{height_from_res}p"
                    except (ValueError, IndexError):
                        pass

                audio_bitrate = fmt.get("abr")
                if audio_bitrate is not None:
                    try:
                        audio_bitrate = int(audio_bitrate)
                    except (TypeError, ValueError):
                        audio_bitrate = None
                bitrate = fmt.get("tbr") or fmt.get("vbr")
                if bitrate is not None:
                    try:
                        bitrate = int(float(bitrate) * 1000)
                    except (TypeError, ValueError):
                        bitrate = None

                content_length = fmt.get("filesize") or fmt.get("filesize_approx")
                if content_length is not None:
                    try:
                        content_length = int(content_length)
                    except (TypeError, ValueError):
                        content_length = None

                approx_ms = str(approx_duration_ms) if approx_duration_ms else None

                return {
                    "itag": itag,
                    "mimeType": fmt.get("mime_type"),
                    "container": fmt.get("container") or fmt.get("ext"),
                    "qualityLabel": quality_label,
                    "audioBitrate": audio_bitrate,
                    "bitrate": bitrate,
                    "hasAudio": has_audio,
                    "hasVideo": has_video,
                    "audioQuality": fmt.get("format_note"),
                    "videoQuality": fmt.get("format_note")
                    or (f"{height}p" if height else None),
                    "contentLength": str(content_length) if content_length else None,
                    "approxDurationMs": approx_ms,
                    "url": fmt.get("url"),
                    "height": height,
                    "width": width,
                    "fps": fmt.get("fps"),
                    "vcodec": fmt.get("vcodec"),
                    "acodec": fmt.get("acodec"),
                    "resolution": resolution,
                }

            raw_formats = info.get("formats", [])
            normalized_videos = []
            normalized_audios = []

            for fmt in raw_formats:  # type: ignore
                normalized = build_format(fmt)
                if not normalized:
                    continue
                if normalized["hasVideo"]:
                    if (normalized.get("height") or 0) >= 720:
                        normalized_videos.append(normalized)
                elif normalized["hasAudio"]:
                    normalized_audios.append(normalized)

            best_video_by_height: Dict[int, Dict[str, Any]] = {}
            for fmt in normalized_videos:
                height = fmt.get("height") or 0
                existing = best_video_by_height.get(height)
                if not existing or (fmt.get("bitrate") or 0) > (
                    existing.get("bitrate") or 0
                ):
                    best_video_by_height[height] = fmt

            video_formats = sorted(
                best_video_by_height.values(),
                key=lambda f: f.get("height") or 0,
                reverse=True,
            )

            def audio_sort_key(fmt: Dict[str, Any]):
                audio_quality = fmt.get("audioQuality", "") or ""
                quality_rank = 0
                lowered = audio_quality.lower()
                if "high" in lowered:
                    quality_rank = 2
                elif "medium" in lowered:
                    quality_rank = 1
                return (
                    fmt.get("audioBitrate") or 0,
                    fmt.get("bitrate") or 0,
                    quality_rank,
                    int(fmt.get("contentLength") or 0),
                )

            best_audio = (
                max(normalized_audios, key=audio_sort_key)
                if normalized_audios
                else None
            )
            if best_audio:
                best_audio["qualityLabel"] = "Best audio"
                if not best_audio.get("audioQuality"):
                    best_audio["audioQuality"] = "high"
                best_audio["hasVideo"] = False
                best_audio["hasAudio"] = True

            formats = video_formats + ([best_audio] if best_audio else [])

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
        itag: Optional[int],
        audioitag: Optional[int],
        format_data: Optional[Dict[str, Any]],
        type_: str,
        info: Optional[Dict[str, Any]],
    ) -> StreamingResponse:
        url = f"https://www.youtube.com/watch?v={video_id}"
        temp_dir = Path(tempfile.mkdtemp(prefix=f"ytdlp_{video_id}_"))
        video_itag = str(itag) if itag is not None else None
        audio_itag = str(audioitag) if audioitag else None

        # Determine whether the selected video format already has audio
        video_has_audio = False
        if isinstance(format_data, dict):
            video_has_audio = bool(format_data.get("hasAudio"))

        def cleanup_directory():
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            finally:
                YoutubeService.remove_progress_emitter(video_id)

        ydl_opts: Dict[str, Any] = {
            "quiet": True,
            "skip_download": False,
            "outtmpl": str(temp_dir / "%(id)s.%(ext)s"),
            "noplaylist": True,
            "merge_output_format": "mp4",
            "restrictfilenames": True,
        }

        if type_ == "audio":
            # For audio-only downloads convert to mp3
            selected_audio_itag = audio_itag or video_itag
            if not selected_audio_itag:
                raise ValueError("Audio itag is required for audio downloads")
            ydl_opts.update(
                {
                    "format": selected_audio_itag,
                    "postprocessors": [
                        {
                            "key": "FFmpegExtractAudio",
                            "preferredcodec": "mp3",
                            "preferredquality": "192",
                        }
                    ],
                }
            )
        else:
            if not video_itag:
                cleanup_directory()
                raise ValueError("Video itag is required for video downloads")
            if not video_has_audio and audio_itag and audio_itag != video_itag:
                ydl_opts["format"] = f"{video_itag}+{audio_itag}"
            else:
                ydl_opts["format"] = video_itag

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:  # type: ignore
                info_dict = ydl.extract_info(url, download=True)

            requested_downloads = info_dict.get("requested_downloads") or []
            candidate_files = []
            for entry in requested_downloads:
                filepath = entry.get("filepath")
                if filepath:
                    path_obj = Path(filepath)
                    if path_obj.exists():
                        candidate_files.append(path_obj)

            if not candidate_files:
                candidate_files = [
                    file_path for file_path in temp_dir.iterdir() if file_path.is_file()
                ]

            if not candidate_files:
                cleanup_directory()
                raise FileNotFoundError("No files produced by yt-dlp download")

            final_path = max(candidate_files, key=lambda item: item.stat().st_size)
            media_type = "audio/mpeg" if type_ == "audio" else "video/mp4"
            total_size = final_path.stat().st_size

            def file_iterator():
                try:
                    with final_path.open("rb") as file_handle:
                        chunk = file_handle.read(1024 * 512)
                        while chunk:
                            yield chunk
                            chunk = file_handle.read(1024 * 512)
                finally:
                    cleanup_directory()

            response = StreamingResponse(file_iterator(), media_type=media_type)
            if total_size:
                response.headers["Content-Length"] = str(total_size)
            return response
        except Exception:
            cleanup_directory()
            raise
