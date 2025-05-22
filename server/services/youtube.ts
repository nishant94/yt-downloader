import ytdl, { videoFormat } from "@distube/ytdl-core";
import { Response } from "express";
import cp from "child_process";
import ffmpegPath from "ffmpeg-static";
import stream from "stream";
import { EventEmitter } from "events";

export class YoutubeService {
  static progressEmitters: Map<string, EventEmitter> = new Map();

  static getProgressEmitter(videoId: string) {
    if (!this.progressEmitters.has(videoId)) {
      this.progressEmitters.set(videoId, new EventEmitter());
    }
    return this.progressEmitters.get(videoId)!;
  }

  static removeProgressEmitter(videoId: string) {
    if (this.progressEmitters.has(videoId)) {
      this.progressEmitters.delete(videoId);
    }
  }

  async getMetadata(videoId: string) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const video = await ytdl.getInfo(url);
    const formats = video.formats.map((f: any) => ({
      itag: f.itag,
      mimeType: f.mimeType,
      container: f.container,
      qualityLabel: f.qualityLabel,
      audioBitrate: f.audioBitrate,
      bitrate: f.bitrate,
      hasAudio: f.hasAudio,
      hasVideo: f.hasVideo,
      audioQuality: f.audioQuality,
      videoQuality: f.quality,
      contentLength: f.contentLength,
      approxDurationMs: f.approxDurationMs,
      url: f.url,
    }));
    const metadata = {
      id: video.videoDetails.videoId,
      title: video.videoDetails.title,
      description: video.videoDetails.description,
      category: video.videoDetails.category,
      lengthSeconds: video.videoDetails.lengthSeconds,
      publishDate: video.videoDetails.publishDate,
      keywords: video.videoDetails.keywords,
      channelName: video.videoDetails.author.name,
      thumbnails: video.videoDetails.thumbnails,
      viewCount: video.videoDetails.viewCount,
      averageRating: video.videoDetails.averageRating,
      formats,
    };
    return metadata;
  }

  private async streamVideoAndAudio(
    url: string,
    videoId: string,
    res: Response,
    itag: number,
    audioitag: number,
    format: videoFormat,
  ) {
    console.log(
      "[YouTubeService] Starting audio and video download streams...",
    );

    const progressEmitter = YoutubeService.getProgressEmitter(videoId);
    progressEmitter.emit("progress", {
      status: "processing",
      progress: 0,
      event: "start-muxing",
    });

    const videoStream = ytdl(url, { quality: itag });
    const audioStream = ytdl(url, { quality: audioitag });

    console.log("[YouTubeService] Spawning ffmpeg process...");
    const ffmpegProcess = cp.spawn(
      ffmpegPath as string,
      [
        "-loglevel",
        "info",
        "-hide_banner",
        "-thread_queue_size",
        "4096",
        "-i",
        "pipe:3", // video
        "-thread_queue_size",
        "4096",
        "-i",
        "pipe:4", // audio
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "pipe:1",
      ],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
      },
    );

    if (ffmpegProcess.stdout) {
      console.log("[YouTubeService] Piping ffmpeg output to response...");
      ffmpegProcess.stdout.pipe(res);
    } else {
      throw new Error("FFmpeg stdout not available");
    }

    const cleanup = () => {
      console.log("[YouTubeService] Cleaning up streams and ffmpeg process...");
      audioStream.destroy();
      videoStream.destroy();
      if (!ffmpegProcess.killed) ffmpegProcess.kill();
    };

    if (ffmpegProcess.stdio[3]) {
      console.log("[YouTubeService] Piping video stream to ffmpeg...");
      videoStream.pipe(ffmpegProcess.stdio[3] as stream.Writable);
    }
    if (ffmpegProcess.stdio[4]) {
      console.log("[YouTubeService] Piping audio stream to ffmpeg...");
      audioStream.pipe(ffmpegProcess.stdio[4] as stream.Writable);
    }

    // --- ffmpeg progress parsing for muxed video/audio ---
    let durationSeconds = 0;
    try {
      durationSeconds = Number(format?.approxDurationMs)
        ? Math.floor(Number(format.approxDurationMs) / 1000)
        : 0;
    } catch (e) {
      durationSeconds = 0;
    }
    if (durationSeconds > 0 && ffmpegProcess.stderr) {
      let lastPercent = 0;
      ffmpegProcess.stderr.setEncoding("utf8");
      ffmpegProcess.stderr.on("data", (data: string) => {
        const match = data.match(/time=([0-9:.]+)/);
        if (match && match[1]) {
          const timeStr = match[1];
          const parts = timeStr.split(":");
          let seconds = 0;
          if (parts.length === 3) {
            seconds =
              parseInt(parts[0]) * 3600 +
              parseInt(parts[1]) * 60 +
              parseFloat(parts[2]);
          }
          let percent = Math.min(
            100,
            Math.round((seconds / durationSeconds) * 100),
          );
          if (percent > lastPercent && percent < 100) {
            lastPercent = percent;
            progressEmitter.emit("progress", {
              status: "processing",
              progress: percent,
              currentTime: seconds,
              totalTime: durationSeconds,
              event: "muxing",
            });
          }
        }
      });
    }

    ffmpegProcess.on("error", (err: any) => {
      console.error("[YouTubeService] FFmpeg error:", err);
      cleanup();
      progressEmitter.emit("progress", {
        status: "error",
        error: err.message,
        event: "muxing-error",
      });
      YoutubeService.removeProgressEmitter(videoId);
      if (!res.headersSent) {
        res.status(500).send("An error occurred while merging video and audio");
      } else {
        res.end();
      }
    });
    ffmpegProcess.on("close", (code, signal) => {
      console.log(
        `[YouTubeService] FFmpeg process closed (code: ${code}, signal: ${signal})`,
      );
      cleanup();
      progressEmitter.emit("progress", {
        status: "finished",
        progress: 100,
        event: "muxing-finished",
      });
      YoutubeService.removeProgressEmitter(videoId);
      res.end();
    });
    videoStream.on("error", (err: any) => {
      console.error("[YouTubeService] Video stream error:", err);
      cleanup();
      progressEmitter.emit("progress", {
        status: "error",
        error: err.message,
        event: "video-stream-error",
      });
      YoutubeService.removeProgressEmitter(videoId);
    });
    audioStream.on("error", (err: any) => {
      console.error("[YouTubeService] Audio stream error:", err);
      cleanup();
      progressEmitter.emit("progress", {
        status: "error",
        error: err.message,
        event: "audio-stream-error",
      });
      YoutubeService.removeProgressEmitter(videoId);
    });
    if (ffmpegProcess.stdio[3])
      ffmpegProcess.stdio[3].on("error", () => {
        console.error("[YouTubeService] ffmpeg video pipe error");
        cleanup();
        progressEmitter.emit("progress", {
          status: "error",
          error: "ffmpeg video pipe error",
          event: "ffmpeg-video-pipe-error",
        });
        YoutubeService.removeProgressEmitter(videoId);
      });
    if (ffmpegProcess.stdio[4])
      ffmpegProcess.stdio[4].on("error", () => {
        console.error("[YouTubeService] ffmpeg audio pipe error");
        cleanup();
        progressEmitter.emit("progress", {
          status: "error",
          error: "ffmpeg audio pipe error",
          event: "ffmpeg-audio-pipe-error",
        });
        YoutubeService.removeProgressEmitter(videoId);
      });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=video_${videoId}.mp4`,
    );

    return new Promise<void>((resolve) => {
      res.on("close", () => {
        console.log("[YouTubeService] Response closed by client.");
        cleanup();
        resolve();
      });
    });
  }

  private async streamWebmAudioToMp3(
    url: string,
    videoId: string,
    res: Response,
    ytdlOptions: any,
  ) {
    const progressEmitter = YoutubeService.getProgressEmitter(videoId);
    progressEmitter.emit("progress", {
      status: "processing",
      progress: 0,
      event: "start-conversion",
    });

    const audioStream = ytdl(url, ytdlOptions);
    const ffmpegProcess = cp.spawn(
      ffmpegPath as string,
      [
        "-loglevel",
        "info",
        "-hide_banner",
        "-thread_queue_size",
        "512",
        "-i",
        "pipe:3",
        "-vn",
        "-acodec",
        "libmp3lame",
        "-f",
        "mp3",
        "pipe:1",
      ],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe", "pipe"], // stderr is now at index 2
      },
    );

    if (ffmpegProcess.stdout) {
      ffmpegProcess.stdout.pipe(res);
    } else {
      throw new Error("FFmpeg stdout not available");
    }

    const cleanup = () => {
      audioStream.destroy();
      if (!ffmpegProcess.killed) ffmpegProcess.kill();
    };

    if (ffmpegProcess.stdio[3]) {
      audioStream.pipe(ffmpegProcess.stdio[3] as stream.Writable);
    }

    // --- ffmpeg progress parsing for audio-only (webm to mp3) ---
    let durationSeconds = 0;
    try {
      const info = await ytdl.getInfo(url);
      durationSeconds = Number(info.videoDetails.lengthSeconds) || 0;
    } catch (e) {
      durationSeconds = 0;
    }
    if (durationSeconds > 0 && ffmpegProcess.stderr) {
      let lastPercent = 0;
      ffmpegProcess.stderr.setEncoding("utf8");
      ffmpegProcess.stderr.on("data", (data: string) => {
        const match = data.match(/time=([0-9:.]+)/);
        if (match && match[1]) {
          const timeStr = match[1];
          const parts = timeStr.split(":");
          let seconds = 0;
          if (parts.length === 3) {
            seconds =
              parseInt(parts[0]) * 3600 +
              parseInt(parts[1]) * 60 +
              parseFloat(parts[2]);
          }
          let percent = Math.min(
            100,
            Math.round((seconds / durationSeconds) * 100),
          );
          if (percent > lastPercent && percent < 100) {
            lastPercent = percent;
            progressEmitter.emit("progress", {
              status: "processing",
              progress: percent,
              currentTime: seconds,
              totalTime: durationSeconds,
              event: "converting",
            });
          }
        }
      });
    }

    ffmpegProcess.on("error", (err: any) => {
      cleanup();
      progressEmitter.emit("progress", {
        status: "error",
        error: err.message,
        event: "conversion-error",
      });
      YoutubeService.removeProgressEmitter(videoId);
      if (!res.headersSent) {
        res.status(500).send("An error occurred while converting audio");
      } else {
        res.end();
      }
    });
    ffmpegProcess.on("close", (code, signal) => {
      cleanup();
      progressEmitter.emit("progress", {
        status: "finished",
        progress: 100,
        event: "conversion-finished",
      });
      YoutubeService.removeProgressEmitter(videoId);
      res.end();
    });
    audioStream.on("error", (err: any) => {
      cleanup();
      progressEmitter.emit("progress", {
        status: "error",
        error: err.message,
        event: "audio-stream-error",
      });
      YoutubeService.removeProgressEmitter(videoId);
    });
    if (ffmpegProcess.stdio[3])
      ffmpegProcess.stdio[3].on("error", () => {
        cleanup();
        progressEmitter.emit("progress", {
          status: "error",
          error: "ffmpeg audio pipe error",
          event: "ffmpeg-audio-pipe-error",
        });
        YoutubeService.removeProgressEmitter(videoId);
      });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=audio_${videoId}.mp3`,
    );

    return new Promise<void>((resolve) => {
      res.on("close", () => {
        cleanup();
        resolve();
      });
    });
  }

  async streamToResponse(
    videoId: string,
    res: Response,
    itag?: number,
    audioitag?: number,
    format?: videoFormat,
    type?: string,
  ) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlOptions: any = {
      quality: itag,
      requestOptions: {
        headers: {
          Cookie: "CONSENT=YES+1",
        },
      },
    };

    const progressEmitter = YoutubeService.getProgressEmitter(videoId);
    let progressSent = false;

    if (type === "video" && !format?.hasAudio && audioitag) {
      progressEmitter.emit("progress", {
        status: "processing",
        progress: 0,
        event: "start-muxing",
      });
      return this.streamVideoAndAudio(
        url,
        videoId,
        res,
        itag!,
        audioitag,
        format!,
      );
    }

    if (type === "audio" && format?.container === "webm") {
      progressEmitter.emit("progress", {
        status: "processing",
        progress: 0,
        event: "start-conversion",
      });
      return this.streamWebmAudioToMp3(url, videoId, res, ytdlOptions);
    }

    const video = ytdl(url, ytdlOptions);
    let totalSize = 0;
    let downloaded = 0;
    let startTime = Date.now();
    video.once("response", (response: any) => {
      totalSize = parseInt(response.headers["content-length"], 10) || 0;
      startTime = Date.now();
    });
    video.on(
      "progress",
      (chunkLength: number, _downloaded: number, total: number) => {
        downloaded += chunkLength;
        if (totalSize > 0) {
          const percent = Math.min(
            100,
            Math.round((downloaded / totalSize) * 100),
          );
          progressEmitter.emit("progress", {
            status: "downloading",
            progress: percent,
            downloaded,
            total: totalSize,
            speed: downloaded / ((Date.now() - startTime) / 1000),
            event: "downloading",
          });
          progressSent = true;
        }
      },
    );
    video.on("end", () => {
      progressEmitter.emit("progress", {
        status: "finished",
        progress: 100,
        event: "download-finished",
      });
      YoutubeService.removeProgressEmitter(videoId);
    });
    video.on("error", (err: any) => {
      progressEmitter.emit("progress", {
        status: "error",
        error: err.message,
        event: "download-error",
      });
      YoutubeService.removeProgressEmitter(videoId);
      if (!res.headersSent) {
        res.status(500).send("An error occurred while streaming the video");
      } else {
        res.end();
      }
    });
    video.pipe(res);
    return new Promise<void>((resolve, reject) => {
      video.on("end", resolve);
      video.on("error", reject);
      res.on("close", () => {
        video.destroy();
        resolve();
      });
    });
  }
}
