import { useForm, SubmitHandler } from "react-hook-form";
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
    <div className="mb-6">
      <form
        className="flex gap-3 mb-2"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
      >
        <div className="relative flex-1 group cursor-pointer">
          <div
            className={`absolute -inset-1 bg-gradient-to-r ${
              errors.videoId
                ? "from-red-600 to-red-400"
                : "from-red-600 to-violet-600"
            } rounded-lg blur opacity-${
              errors.videoId ? "50" : "25"
            } group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}
          ></div>
          <div className="relative rounded-lg leading-none">
            <input
              type="text"
              placeholder="Enter YouTube Video ID"
              {...register("videoId")}
              onChange={(e) => setValue("videoId", e.target.value)}
              disabled={loading}
              className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md outline-none transition-all duration-300 ring-1 ${
                errors.videoId ? "ring-red-400" : "ring-gray-900/5"
              }`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!videoId || loading}
          className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white shadow-lg hover:from-fuchsia-500 hover:to-cyan-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Fetching..." : "Fetch Metadata"}
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
