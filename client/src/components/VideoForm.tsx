import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { videoIdSchema } from "../helpers/validation";

type FormValues = { videoId: string };

interface VideoFormProps {
  loading: boolean;
  onSubmit: (values: FormValues) => void;
  error: string;
}

const VideoForm = ({ loading, onSubmit, error }: VideoFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(videoIdSchema),
    defaultValues: { videoId: "" },
  });
  const videoId = watch("videoId");

  return (
    <div className="mb-0">
      <form
        className="flex gap-3 mb-0"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
      >
        <div className="relative flex-1 group cursor-pointer">
          <div
            className={`absolute -inset-1 bg-gradient-to-r ${
              errors.videoId
                ? "from-pink-400 to-purple-400"
                : "from-blue-400 to-blue-200"
            } rounded-lg blur opacity-${
              errors.videoId ? "60" : "30"
            } group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}
          ></div>
          <div className="relative rounded-lg leading-none">
            <input
              type="text"
              placeholder="Enter YouTube Video ID"
              {...register("videoId")}
              onChange={(e) => setValue("videoId", e.target.value)}
              disabled={loading}
              className={`w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 shadow-lg outline-none transition-all duration-300 ring-2 focus:ring-blue-400 focus:shadow-blue-200/30 dark:focus:ring-pink-400/80 ${
                errors.videoId
                  ? "ring-pink-400 dark:ring-pink-400"
                  : "ring-blue-200 dark:ring-blue-400"
              }`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!videoId || loading}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-royal-gold via-accent to-royal-blue text-white shadow-xl hover:from-accent hover:to-royal-gold hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-royal-gold/60 dark:border-accent/60 focus:outline-none focus:ring-4 focus:ring-royal-gold/40 dark:focus:ring-accent/40"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2 animate-pulse">
              <svg
                className="w-5 h-5 animate-spin"
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
              Fetching...
            </span>
          ) : (
            "Fetch Metadata"
          )}
        </button>
      </form>
      {errors.videoId && (
        <p className="text-red-500 text-sm ml-1">{errors.videoId.message}</p>
      )}
      {error && <p className="text-red-500 text-sm ml-1">{error}</p>}
    </div>
  );
};

export default VideoForm;
