/*
 * Turning a camera frame or a picked photo into a JPEG small enough to
 * upload. Phone cameras take 10+ MB photos; the server takes 5 MB.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.85;

function drawToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<File> {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("No canvas"));
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], "tree.jpg", { type: "image/jpeg" }))
          : reject(new Error("Could not make a JPEG")),
      "image/jpeg",
      QUALITY,
    );
  });
}

/** The frame the video is showing right now. */
export function frameToJpeg(video: HTMLVideoElement) {
  return drawToJpeg(video, video.videoWidth, video.videoHeight);
}

/** A photo from the file picker, upright and scaled down. */
export async function fileToJpeg(file: File) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    return await drawToJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
