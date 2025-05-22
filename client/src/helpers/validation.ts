import * as yup from "yup";

export const videoIdSchema = yup.object({
  videoId: yup
    .string()
    .required("Video ID is required")
    .matches(/^[\w-]{11}$/, "Invalid YouTube video ID format"),
});
