import api from "../api/api";


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export type Format = {
  itag: number;
  mimeType: string;
  container: string;
  qualityLabel?: string;
  audioBitrate?: number;
  bitrate?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  audioQuality?: string;
  videoQuality?: string;
  contentLength?: string;
  approxDurationMs?: string;
  url: string;
};

export type Metadata = {
  id: string;
  title: string;
  description: string;
  category: string;
  lengthSeconds: string;
  publishDate: string;
  keywords: string[];
  viewCount?: string;
  averageRating?: string;
  channelName: string;
  thumbnails: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  formats: Format[];
};

export const fetchMetadata = async (videoId: string): Promise<Metadata> => {
  const res = await api.get("/youtube/metadata", {
    params: { videoId },
  });
  return res.data.data;
};

export const downloadVideo = async (
  videoId: string,
  itag: number,
  format: any,
  type: string,
  metadata: Metadata,
  audioitag: number,
) => {
  api
    .post(
      "/youtube/download",
      { videoId, itag, audioitag, format, type, metadata },
      { responseType: "blob" },
    )
    .then((response: { data: Blob }) => {
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${metadata?.title}.${type == "audio" ? "mp3" : "mp4"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(() => {
      // Error is handled by SSE progress
    });
};
