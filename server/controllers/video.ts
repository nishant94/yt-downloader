import { Request, Response } from "express";
import { ERRORS_MESSAGES, STATUS, SUCCESS_MESSAGES } from "../constants";
import { YoutubeService } from "../services/youtube";
import logger from "../logger";
import { raw } from "body-parser";

export class VideoController {
  async getYoutubeMetadata(req: Request, res: Response) {
    const youtubeService = new YoutubeService();
    const videoId = req.query.videoId as string;

    logger.info(`Getting metadata for videoId: ${videoId}`);

    if (!videoId) {
      logger.error(`Missing videoId: ${videoId}`);
      return res.status(400).json({
        status: STATUS.ERROR,
        code: 400,
        error: ERRORS_MESSAGES.MISSING_VIDEO_ID,
      });
    }

    if (typeof videoId !== "string") {
      logger.error(`Invalid videoId: ${videoId}`);
      return res.status(400).json({
        status: STATUS.ERROR,
        code: 400,
        error: ERRORS_MESSAGES.INVALID_VIDEO_ID,
      });
    }

    try {
      logger.info(
        `[getYoutubeMetadata] Fetching metadata for videoId: ${videoId}`,
      );
      const metadata = await youtubeService.getMetadata(videoId, req.cookies);
      logger.info(
        `[getYoutubeMetadata] Metadata fetched successfully for videoId: ${videoId}`,
      );
      res.status(200).json({
        status: STATUS.SUCCESS,
        code: 200,
        message: SUCCESS_MESSAGES.FETCHING_METADATA,
        data: metadata,
      });
    } catch (error: any) {
      logger.error(
        `[getYoutubeMetadata] Error fetching metadata for videoId: ${videoId} - ${
          (error && error.message) || error
        }`,
      );
      if (error && error.stack) {
        logger.error(`[getYoutubeMetadata] Stack: ${error.stack}`);
      }
      res.status(400).json({
        status: STATUS.ERROR,
        code: 400,
        error: ERRORS_MESSAGES.FETCHING_METADATA,
        details: (error && error.message) || error,
      });
    }
  }

  async streamYoutubeVideo(req: Request, res: Response) {
    console.log("Streaming YouTube video...");
    try {
      const videoId = req.body.videoId;
      const itag = req.body.itag;
      const audioitag = req.body.audioitag;
      const format = req.body.format;
      const type = req.body.type;
      const info = req.body.metadata;

      if (!videoId) {
        return res.status(400).json({ error: "Video ID is required" });
      }

      const youtubeService = new YoutubeService();

      try {
        const title =
          info.title.replace(/[^ -]+/g, "").replace(/[^\w\s]/gi, "") || videoId;

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${title}.${type === "video" ? "mp4" : "mp3"}"`,
        );
        res.setHeader("Content-Type", "application/octet-stream");

        await youtubeService.streamToResponse(
          videoId,
          title,
          res,
          itag ? Number(itag) : undefined,
          audioitag ? Number(audioitag) : undefined,
          format,
          type,
        );
      } catch (error) {
        console.error("Error streaming video:", error);
        res.status(500).json({ error: "Failed to stream video" });
      }
    } catch (error) {
      console.error("Controller error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
