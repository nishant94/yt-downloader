import { Metadata } from "../api/youtube";
import { useState, useRef } from "react";
import { useTheme } from "../helpers/ThemeContext";

function getThumbnail(
  thumbnails: { url: string; width: number; height: number }[],
): string {
  if (!thumbnails || thumbnails.length === 0) return "";
  return thumbnails.reduce((best, current) => {
    const bestArea = best.width * best.height;
    const currentArea = current.width * current.height;
    return currentArea > bestArea ? current : best;
  }).url;
}

interface VideoMetadataProps {
  metadata: Metadata;
  onDownload: (
    itag: number,
    format: any,
    type: string,
    metadata: Metadata,
    audioItag: number,
  ) => void;
}

const VideoMetadata = ({ metadata, onDownload }: VideoMetadataProps) => {
  const { theme } = useTheme();

  metadata.formats = Object.values(
    metadata.formats.reduce((acc, format) => {
      acc[format.itag] = acc[format.itag] || format;
      return acc;
    }, {} as Record<number, (typeof metadata.formats)[number]>),
  );

  const allVideoFormats = metadata.formats.filter(
    (f) => f.hasVideo && f.qualityLabel && f.container === "mp4",
  );
  const videoFormats = Object.values(
    allVideoFormats.reduce((acc, format) => {
      if (!format.qualityLabel) return acc;
      const key = format.qualityLabel;
      if (!acc[key] || (format.bitrate || 0) > (acc[key].bitrate || 0)) {
        acc[key] = format;
      }
      return acc;
    }, {} as Record<string, (typeof allVideoFormats)[number]>),
  ).sort((a, b) => {
    const getNum = (label: string) => parseInt(label);
    return getNum(b.qualityLabel!) - getNum(a.qualityLabel!);
  });

  const audioFormats = metadata.formats
    .filter(
      (f) =>
        f.hasAudio &&
        !f.hasVideo &&
        (f.audioBitrate != undefined
          ? f.audioBitrate > 64
          : f.bitrate ?? 0 > 64000),
    )
    .sort(
      (a, b) =>
        (b.audioBitrate || b.bitrate || 0) - (a.audioBitrate || a.bitrate || 0),
    );

  const [type, setType] = useState<"video" | "audio">("video");
  const [selectedItag, setSelectedItag] = useState<number>(
    videoFormats.length > 0 ? videoFormats[0].itag : audioFormats[0]?.itag || 0,
  );

  const [selectedAudioItag, setSelectedAudioItag] = useState<number>(
    audioFormats.length > 0 ? audioFormats[0].itag : 0,
  );

  const [progress, setProgress] = useState<{
    status: string;
    progress: number;
    downloaded?: number;
    total?: number;
    speed?: number;
    error?: string;
    event?: string;
    currentTime?: number;
    totalTime?: number;
  } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as "video" | "audio";
    setType(newType);
    if (newType === "video" && videoFormats.length > 0) {
      setSelectedItag(videoFormats[0].itag);
      // If video has no audio, select best audio
      if (!videoFormats[0].hasAudio && audioFormats.length > 0) {
        setSelectedAudioItag(audioFormats[0].itag);
      }
    } else if (newType === "audio" && audioFormats.length > 0) {
      setSelectedItag(audioFormats[0].itag);
    }
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itag = Number(e.target.value);
    setSelectedItag(itag);
    const selectedVideo = videoFormats.find((f) => f.itag === itag);
    if (
      type === "video" &&
      selectedVideo &&
      !selectedVideo.hasAudio &&
      audioFormats.length > 0
    ) {
      setSelectedAudioItag(audioFormats[0].itag);
    }
  };

  const handleDownload = () => {
    setProgress({ status: "processing", progress: 0 });
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    eventSourceRef.current = new EventSource(
      `${import.meta.env.VITE_BACKEND_URL.replace(
        /\/$/,
        "",
      )}/progress/${metadata.id}`,
    );
    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      if (data.status === "finished" || data.status === "error") {
        eventSourceRef.current?.close();
        setTimeout(() => setProgress(null), 2000);
      }
    };
    eventSourceRef.current.onerror = (err) => {
      console.error("[VideoMetadata] SSE error", err);
      setProgress((prev) =>
        prev
          ? { ...prev, status: "error", error: "Connection lost" }
          : { status: "error", progress: 0, error: "Connection lost" },
      );
      eventSourceRef.current?.close();
    };
    if (type === "video") {
      const selectedVideo = videoFormats.find((f) => f.itag === selectedItag);
      if (selectedVideo && !selectedVideo.hasAudio && audioFormats.length > 0) {
        onDownload(
          selectedItag,
          selectedVideo,
          type,
          metadata,
          selectedAudioItag,
        );
        return;
      }
    }
    const selectedAudio = audioFormats.find((f) => f.itag === selectedItag);
    onDownload(selectedItag, selectedAudio, type, metadata, selectedAudioItag);
  };

  return (
    <div
      className={`mt-10 rounded-4xl p-10 shadow-royal-xl flex flex-col items-center gap-6 animate-fadeInUp max-w-2xl mx-auto transition-all duration-500 ${
        theme === "dark" ? "card-dark" : "card-light"
      } border border-transparent`}
    >
      <div className="flex flex-col items-center w-full">
        <img
          src={getThumbnail(metadata.thumbnails)}
          alt="thumbnail"
          className="mb-4 rounded-3xl shadow-royal-xl max-w-xl w-full aspect-video object-cover border-2 border-accent"
        />
        <h2 className="accent font-orbitron text-2xl font-bold mb-2 text-center drop-shadow-xl">
          {metadata.title}
        </h2>
      </div>
      <div
        className="w-full flex flex-col gap-2 text-base font-medium"
        style={{
          color: theme === "dark" ? "#f0f0f0" : "#2a2a2a",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold accent">Channel:</span>
          <span className="truncate">{metadata.channelName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold accent">Duration:</span>
          <span>
            {(() => {
              const totalSeconds = Number(metadata.lengthSeconds);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              return `${minutes}m ${seconds}s`;
            })()}
          </span>
        </div>
        {metadata.viewCount && (
          <div className="flex items-center gap-2">
            <span className="font-semibold accent">Views:</span>
            <span>{Number(metadata.viewCount).toLocaleString()}</span>
          </div>
        )}
        {metadata.publishDate && (
          <div className="flex items-center gap-2">
            <span className="font-semibold accent">Published:</span>
            <span>{metadata.publishDate}</span>
          </div>
        )}
        {/* {metadata.description && (
          <div
            className="mt-4 rounded-xl p-4 text-sm max-h-40 overflow-y-auto shadow-inner"
            style={{
              background: theme === "dark" ? "#23232b" : "#f8f9fa",
              color: theme === "dark" ? "#f0f0f0" : "#2a2a2a",
            }}
          >
            <span className="accent block mb-1 font-semibold">
              Description:
            </span>
            <span className="whitespace-pre-line">{metadata.description}</span>
          </div>
        )} */}
      </div>
      <div className="w-full flex flex-col gap-4 mt-4">
        <div className="flex gap-4 items-center">
          <label className="font-semibold accent">Download Type:</label>
          <div className="relative w-44">
            <select
              value={type}
              onChange={handleTypeChange}
              className="rounded-lg px-4 py-2 bg-white accent border border-accent/40 shadow-sm focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200 appearance-none w-full cursor-pointer hover:shadow-lg hover:border-accent/80"
              style={{
                WebkitAppearance: "none",
                MozAppearance: "none",
                appearance: "none",
              }}
            >
              {videoFormats.length > 0 && <option value="video">Video</option>}
              {audioFormats.length > 0 && <option value="audio">Audio</option>}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-accent">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path
                  d="M7 10l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
        {type === "video" && videoFormats.length > 0 && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold accent">Quality:</label>
            <div className="relative w-44">
              <select
                value={selectedItag}
                onChange={handleFormatChange}
                className="rounded-lg px-4 py-2 bg-white accent border border-accent/40 shadow-sm focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200 appearance-none w-full cursor-pointer hover:shadow-lg hover:border-accent/80"
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  appearance: "none",
                }}
              >
                {videoFormats.map((f) => (
                  <option key={f.itag} value={f.itag}>
                    {f.qualityLabel}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-accent">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M7 10l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        )}
        {type === "audio" && audioFormats.length > 0 && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold accent">Bitrate:</label>
            <div className="relative w-44">
              <select
                value={selectedItag}
                onChange={handleFormatChange}
                className="rounded-lg px-4 py-2 bg-white accent border border-accent/40 shadow-sm focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200 appearance-none w-full cursor-pointer hover:shadow-lg hover:border-accent/80"
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  appearance: "none",
                }}
              >
                {audioFormats.map((f) => (
                  <option key={f.itag} value={f.itag}>
                    {f.audioBitrate || Math.round((f.bitrate || 0) / 1000)} kbps
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-accent">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M7 10l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        )}
      </div>
      {progress && (
        <div className="w-full mt-4 flex flex-col items-center">
          <div
            className="mb-2 font-semibold flex items-center gap-2"
            style={{
              color: theme === "dark" ? "#f0f0f0" : "#2a2a2a",
            }}
          >
            {progress.status === "downloading" ||
            progress.status === "processing" ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 accent"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                {progress.event === "downloading" &&
                  `Downloading: ${progress.progress}%`}
                {progress.event === "muxing" &&
                  `Processing: ${progress.progress}%`}
                {progress.event === "converting" &&
                  `Converting: ${progress.progress}%`}
                {!progress.event &&
                  `${
                    progress.status.charAt(0).toUpperCase() +
                    progress.status.slice(1)
                  }...`}
              </>
            ) : null}
            {progress.status === "finished" && "Download finished!"}
            {progress.status === "error" && `Error: ${progress.error}`}
          </div>
          {(progress.status === "downloading" ||
            progress.status === "processing") && (
            <div
              className="w-full rounded-full h-3"
              style={{
                background: theme === "dark" ? "#23232b" : "#e0e0e0",
              }}
            >
              <div
                className="bg-accent h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
          )}
          {progress.downloaded !== undefined &&
            progress.total !== undefined && (
              <div
                className="text-xs mt-1"
                style={{
                  color: theme === "dark" ? "#f0f0f0" : "#2a2a2a",
                }}
              >
                {`${(progress.downloaded / 1024 / 1024).toFixed(2)} MB / ${(
                  progress.total /
                  1024 /
                  1024
                ).toFixed(2)} MB`}
                {progress.speed &&
                  ` • ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`}
              </div>
            )}
          {progress.currentTime !== undefined &&
            progress.totalTime !== undefined && (
              <div
                className="text-xs mt-1"
                style={{
                  color: theme === "dark" ? "#f0f0f0" : "#2a2a2a",
                }}
              >
                {`${Math.floor(progress.currentTime / 60)}:${String(
                  Math.floor(progress.currentTime % 60),
                ).padStart(2, "0")}`}
                {" / "}
                {`${Math.floor(progress.totalTime / 60)}:${String(
                  Math.floor(progress.totalTime % 60),
                ).padStart(2, "0")}`}
              </div>
            )}
        </div>
      )}
      <button
        onClick={handleDownload}
        className="mt-6 px-10 py-3 rounded-2xl font-bold bg-accent text-white shadow-royal-xl hover:opacity-90 transition-all duration-300 text-lg tracking-wide drop-shadow-xl border-2 border-accent focus:outline-none focus:ring-4 focus:ring-accent/40"
        disabled={!selectedItag}
        style={{ backgroundColor: "#ff6f61", borderColor: "#ff6f61" }}
      >
        <span className="inline-flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m0 0l-6-6m6 6l6-6"
            />
          </svg>
          Download {type === "video" ? "Video" : "Audio"}
        </span>
      </button>
    </div>
  );
};

export default VideoMetadata;
