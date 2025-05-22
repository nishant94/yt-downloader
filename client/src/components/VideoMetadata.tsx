import { Metadata } from "../api/youtube";
import { useState, useRef } from "react";

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
    audioItag?: number,
    format?: any,
    type?: string,
    metadata?: Metadata,
  ) => void;
}

const VideoMetadata = ({ metadata, onDownload }: VideoMetadataProps) => {
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
    .filter((f) => f.hasAudio && !f.hasVideo)
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
      `/youtube/progress/${metadata.id}`,
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
          selectedAudioItag,
          selectedVideo,
          type,
          metadata,
        );
        return;
      }
    }
    const selectedAudio = audioFormats.find((f) => f.itag === selectedItag);
    onDownload(selectedItag, selectedItag, selectedAudio, type, metadata);
  };

  return (
    <div className="mt-10 bg-white/80 dark:bg-gray-900/80 rounded-4xl p-10 shadow-4xl flex flex-col items-center gap-6 animate-fadeInUp border border-fuchsia-200 dark:border-fuchsia-700 backdrop-blur-md max-w-2xl mx-auto">
      <div className="flex flex-col items-center w-full">
        <img
          src={getThumbnail(metadata.thumbnails)}
          alt="thumbnail"
          className="mb-6 rounded-2xl shadow-2xl max-w-lg w-full aspect-video object-cover border-4 border-fuchsia-200 dark:border-fuchsia-700 hover:scale-105 transition-transform duration-300"
        />
        <h2 className="text-fuchsia-600 font-orbitron text-2xl font-bold mb-2 text-center drop-shadow-lg">
          {metadata.title}
        </h2>
      </div>
      <div className="w-full flex flex-col gap-2 text-cyan-700 dark:text-cyan-200 text-base font-medium">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fuchsia-500">Channel:</span>
          <span className="truncate">{metadata.channelName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fuchsia-500">Duration:</span>
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
            <span className="font-semibold text-fuchsia-500">Views:</span>
            <span>{Number(metadata.viewCount).toLocaleString()}</span>
          </div>
        )}
        {metadata.publishDate && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fuchsia-500">Published:</span>
            <span>{metadata.publishDate}</span>
          </div>
        )}
        {metadata.description && (
          <div className="mt-4 bg-cyan-50/60 dark:bg-gray-800/60 rounded-xl p-4 text-gray-700 dark:text-gray-200 text-sm max-h-40 overflow-y-auto shadow-inner">
            <span className="font-semibold text-fuchsia-500 block mb-1">
              Description:
            </span>
            <span className="whitespace-pre-line">{metadata.description}</span>
          </div>
        )}
      </div>
      <div className="w-full flex flex-col gap-4 mt-4">
        <div className="flex gap-4 items-center">
          <label className="font-semibold text-fuchsia-500">
            Download Type:
          </label>
          <select
            value={type}
            onChange={handleTypeChange}
            className="rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border border-fuchsia-300 dark:border-fuchsia-700"
          >
            {videoFormats.length > 0 && <option value="video">Video</option>}
            {audioFormats.length > 0 && <option value="audio">Audio</option>}
          </select>
        </div>
        {type === "video" && videoFormats.length > 0 && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold text-fuchsia-500">Quality:</label>
            <select
              value={selectedItag}
              onChange={handleFormatChange}
              className="rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border border-fuchsia-300 dark:border-fuchsia-700"
            >
              {videoFormats.map((f) => (
                <option key={f.itag} value={f.itag}>
                  {f.qualityLabel}
                </option>
              ))}
            </select>
          </div>
        )}
        {type === "audio" && audioFormats.length > 0 && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold text-fuchsia-500">Bitrate:</label>
            <select
              value={selectedItag}
              onChange={handleFormatChange}
              className="rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border border-fuchsia-300 dark:border-fuchsia-700"
            >
              {audioFormats.map((f) => (
                <option key={f.itag} value={f.itag}>
                  {f.audioBitrate || Math.round((f.bitrate || 0) / 1000)} kbps
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {progress && (
        <div className="w-full mt-4 flex flex-col items-center">
          <div className="mb-2 text-cyan-700 dark:text-cyan-200 font-semibold flex items-center gap-2">
            {progress.status === "downloading" ||
            progress.status === "processing" ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-fuchsia-500"
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
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
              <div
                className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
          )}
          {progress.downloaded !== undefined &&
            progress.total !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
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
              <div className="text-xs text-gray-500 mt-1">
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
        className="mt-6 px-10 py-3 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white shadow-xl hover:from-cyan-400 hover:to-fuchsia-500 transition-all duration-300 text-lg tracking-wide drop-shadow-lg"
        disabled={!selectedItag}
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
