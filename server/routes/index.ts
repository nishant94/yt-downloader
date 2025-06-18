import { Router, Request, Response, NextFunction } from "express";
import { VideoController } from "../controllers/video";
import { YoutubeService } from "../services/youtube";
import { createSession, isValidSession } from "../services/session";
import crypto from "crypto";

const router = Router();
const videoController = new VideoController();
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

router.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

router.get("/get-session", async (req, res) => {
  let sessionId = req.cookies?.sessionId;
  if (!sessionId || !(await isValidSession(sessionId))) {
    sessionId = crypto.randomBytes(24).toString("hex");
    await createSession(sessionId, Date.now() + SESSION_DURATION);
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: SESSION_DURATION,
      secure: process.env.NODE_ENV === "production",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
  }
  res.status(200).json({ ok: true });
});

async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    res.status(401).json({ message: "SessionId not found", sessionId });
    return;
  }
  if (!(await isValidSession(sessionId))) {
    res.status(401).json({ message: "Invalid or expired session", sessionId });
    return;
  }
  next();
}

router.get("/youtube/metadata", requireSession, (req, res) => {
  videoController.getYoutubeMetadata(req, res);
});

router.post("/youtube/download", requireSession, (req, res) => {
  videoController.streamYoutubeVideo(req, res);
});

router.get("/progress/:videoId", (req, res) => {
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
