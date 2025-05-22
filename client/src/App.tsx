import { useState } from "react";
import AnimatedBackground from "./components/AnimatedBackground";
import ThemeToggle from "./components/ThemeToggle";
import VideoForm from "./components/VideoForm";
import VideoMetadata from "./components/VideoMetadata";
import { fetchMetadata, downloadVideo, Metadata } from "./api/youtube";
import { ThemeProvider } from "./helpers/ThemeContext";

const App = () => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [videoId, setVideoId] = useState<string>("");

  const handleFetchMetadata = async ({ videoId }: { videoId: string }) => {
    setLoading(true);
    setError("");
    setMetadata(null);
    setVideoId(videoId);
    try {
      const data = await fetchMetadata(videoId);
      setMetadata(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (
    itag: number,
    format: any,
    type: string,
    metadata: Metadata,
    selectedAudioItag: number,
  ) => {
    downloadVideo(videoId, itag, format, type, metadata, selectedAudioItag);
  };

  return (
    <ThemeProvider>
      <AnimatedBackground />
      <div
        className="container mx-auto max-w-2xl sm:max-w-3xl mt-20 sm:mt-28 p-5 sm:p-8 bg-gradient-to-br from-neutral-50/90 via-white/80 to-blue-50/70 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-indigo-900/70 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl border border-neutral-200 dark:border-gray-800 transition-all duration-700 group hover:scale-[1.01] hover:shadow-[0_6px_24px_0_rgba(31,38,135,0.10)]"
        style={{
          boxShadow: "0 2px 12px 0 rgba(31, 38, 135, 0.08)",
          border: "1.5px solid rgba(220,220,255,0.10)",
        }}
      >
        <ThemeToggle />
        <div className="flex flex-col items-center mb-8 animate-fadeInUp">
          {/* <div className="relative mb-2">
            <img
              src="/youtube-download-svgrepo-com.svg"
              alt="YouTube Downloader"
              className="w-20 h-20 drop-shadow-2xl animate-glow"
            />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-tr from-pink-400 to-accent rounded-full blur-sm opacity-80 animate-pulse"></span>
          </div> */}
          <h1
            className="font-orbitron text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-500 via-pink-400 to-purple-400 bg-clip-text text-transparent tracking-widest text-center drop-shadow-2xl mb-2 animate-gradient-x"
            style={{ letterSpacing: "0.18em" }}
          >
            YouTube Video Downloader
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 font-medium mb-2 text-center max-w-xl animate-fadeIn">
            Download your favorite YouTube videos in high quality with a single
            click.
            <br className="hidden sm:block" /> Fast, secure, and free.
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg p-4 sm:p-6 mb-6 transition-all duration-500 animate-fadeInUp border border-neutral-100 dark:border-gray-700">
          <VideoForm
            loading={loading}
            onSubmit={handleFetchMetadata}
            error={error}
          />
        </div>
        {error && (
          <div className="text-red-600 dark:text-red-400 font-semibold mb-4 px-4 py-2 rounded-lg bg-red-100/80 dark:bg-red-900/40 border border-red-200 dark:border-red-700 animate-shake shadow-md transition-all duration-300 animate-fadeIn">
            {error}
          </div>
        )}
        {metadata && (
          <div className="rounded-2xl bg-white/90 dark:bg-gray-900/90 shadow-xl p-4 sm:p-6 mt-4 animate-fadeInUp border border-blue-200/30 dark:border-pink-400/20">
            <VideoMetadata metadata={metadata} onDownload={handleDownload} />
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
