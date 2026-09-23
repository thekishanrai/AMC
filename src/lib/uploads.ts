// Shared by the browser pre-check and the server. The form-attachments bucket
// enforces the same limits itself, so a client that lies still gets rejected.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "video/mp4", "video/quicktime"];
export const UPLOAD_FORMS = ["request-location", "report-bug"] as const;
export function uploadProblem(file: { size: number; type: string }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return "Too big, max 20 MB.";
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return "Use a photo or short video (JPG, PNG, WebP, HEIC, MP4 or MOV).";
  return null;
}
