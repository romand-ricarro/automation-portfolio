/**
 * File Upload Utilities
 *
 * Handles the presigned URL upload flow for R2/S3.
 */

// API URL: empty string = same origin (production), set VITE_API_URL for local dev
const API_URL = import.meta.env.VITE_API_URL ?? "";

interface SignedUrlResponse {
  upload_url: string;
  public_url: string;
  key: string;
}

interface UploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mime_type: string;
}

/**
 * Get a presigned URL from the backend for uploading a file.
 */
async function getSignedUrl(
  filename: string,
  contentType: string,
  token: string
): Promise<SignedUrlResponse> {
  const response = await fetch(`${API_URL}/api/upload/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename,
      content_type: contentType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get upload URL");
  }

  return response.json();
}

/**
 * Upload a file directly to R2/S3 using the presigned URL.
 */
async function uploadToR2(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Upload a file using the presigned URL flow.
 *
 * 1. Request signed URL from backend.
 * 2. PUT file directly to R2.
 * 3. Return the public URL and metadata.
 */
export async function uploadFile(
  file: File,
  token: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Step 1: Get signed URL
  const { upload_url, public_url, key } = await getSignedUrl(
    file.name,
    file.type || "application/octet-stream",
    token
  );

  // Step 2: Upload directly to R2
  await uploadToR2(file, upload_url, onProgress);

  // Step 3: Return result
  return {
    url: public_url,
    key,
    filename: file.name,
    size: file.size,
    mime_type: file.type || "application/octet-stream",
  };
}

/**
 * Upload multiple files.
 */
export async function uploadFiles(
  files: File[],
  token: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile(files[i], token, (progress) =>
      onProgress?.(i, progress)
    );
    results.push(result);
  }

  return results;
}
