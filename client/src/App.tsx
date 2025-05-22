import { useState, useEffect } from "react";
import AnimatedBackground from "./components/AnimatedBackground";
import ThemeToggle from "./components/ThemeToggle";
import VideoForm from "./components/VideoForm";
import VideoMetadata from "./components/VideoMetadata";
import { fetchMetadata, downloadVideo, Metadata } from "./api/youtube";

const App = () => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [theme, setTheme] = useState<string>("dark");
  const [videoId, setVideoId] = useState<string>("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // When theme changes, update both document class and localStorage
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

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

  const handleDownload = (itag: number, selectedAudioItag?: number, format?: any, type?: string, metadata?: Metadata) => {
    downloadVideo(videoId, itag, selectedAudioItag, format, type, metadata);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <>
      <AnimatedBackground />
      <div className="container mx-auto max-w-3xl mt-50 p-8 bg-white/80 dark:bg-gray-500 rounded-3xl shadow-2xl relative overflow-hidden">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <h1 className="font-orbitron text-3xl font-bold text-accent mb-8 tracking-widest text-center drop-shadow-lg">
          YouTube Video Downloader
        </h1>
        <VideoForm
          loading={loading}
          onSubmit={handleFetchMetadata}
          error={error}
        />
        {error && (
          <div className="text-highlight font-semibold mb-2 animate-fadeInUp">
            {error}
          </div>
        )}
        {metadata && (
          <VideoMetadata metadata={metadata} onDownload={handleDownload} />
        )}
      </div>
    </>
  );
};

export default App;
