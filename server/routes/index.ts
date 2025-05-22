import { Router } from "express";
import { VideoController } from "../controllers/video";
import { YoutubeService } from "../services/youtube";

const router = Router();
const videoController = new VideoController();

router.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

/**
 * @swagger
 * /youtube/metadata:
 *   get:
 *     description: Get metadata of a youtube video
 *     parameters:
 *       - name: videoId
 *         description: The youtube video id
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: A successful response
 *       400:
 *         description: Bad request
 */
router.get("/youtube/metadata", (req, res) => {
  videoController.getYoutubeMetadata(req, res);
});

/**
 * @swagger
 * /youtube/download:
 *   get:
 *     description: Stream and download a youtube video directly to the client
 *     parameters:
 *       - name: videoId
 *         description: The youtube video id
 *         in: query
 *         required: true
 *         type: string
 *       - name: itag
 *         description: video format itag
 *         in: query
 *         required: true
 *         type: number
 *     responses:
 *       200:
 *         description: File stream
 *       400:
 *         description: Bad request
 */

router.post("/youtube/download", (req, res) => {
  videoController.streamYoutubeVideo(req, res);
});

/**
 * @swagger
 * /youtube/progress/{videoId}:
 *   get:
 *     description: Stream progress events for a given videoId
 *     parameters:
 *       - name: videoId
 *         description: The youtube video id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Event stream
 *       400:
 *         description: Bad request
 */
router.get("/youtube/progress/:videoId", (req, res) => {
  const { videoId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();

  const emitter = YoutubeService.getProgressEmitter(videoId);
  const onProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (data.status === "finished" || data.status === "error") {
      res.end();
    }
  };
  emitter.on("progress", onProgress);

  req.on("close", () => {
    emitter.off("progress", onProgress);
  });
});

export default router;
