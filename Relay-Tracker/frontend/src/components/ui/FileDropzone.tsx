import {
  useState,
  useRef,
  useEffect,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { Upload, X, File as FileIcon, Loader2 } from "lucide-react";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  files?: File[];
  isUploading?: boolean;
  uploadProgress?: number;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  onFileRemove,
  files = [],
  isUploading = false,
  uploadProgress = 0,
  accept = "image/*,application/pdf,.doc,.docx,.txt",
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Generate thumbnails for image files using URL.createObjectURL
  useEffect(() => {
    const newThumbnails = new Map<string, string>();
    const urlsToRevoke: string[] = [];

    files.forEach((file, index) => {
      const key = `${file.name}-${index}-${file.size}`;
      if (file.type.startsWith("image/")) {
        // Check if we already have this thumbnail
        const existingUrl = thumbnails.get(key);
        if (existingUrl) {
          newThumbnails.set(key, existingUrl);
        } else {
          // Create new object URL for instant preview
          const url = URL.createObjectURL(file);
          newThumbnails.set(key, url);
        }
      }
    });

    // Revoke URLs that are no longer needed
    thumbnails.forEach((url, key) => {
      if (!newThumbnails.has(key)) {
        urlsToRevoke.push(url);
      }
    });

    setThumbnails(newThumbnails);

    // Cleanup old URLs
    urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));

    // Cleanup on unmount
    return () => {
      if (files.length === 0) {
        newThumbnails.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, [files]);

  // Close lightbox on Escape key (with event capture to prevent modal from closing)
  useEffect(() => {
    if (!lightboxUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setLightboxUrl(null);
      }
    };
    // Use capture phase to intercept before the modal's handler
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [lightboxUrl]);

  const validateFiles = (fileList: File[]): File[] => {
    setError(null);

    // Check max files
    if (files.length + fileList.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return [];
    }

    // Filter and validate
    const validFiles = fileList.filter((file) => {
      if (file.size > maxSizeBytes) {
        setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
        return false;
      }
      return true;
    });

    return validFiles;
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(droppedFiles);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || disabled) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles = validateFiles(selectedFiles);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getThumbnailKey = (file: File, index: number): string => {
    return `${file.name}-${index}-${file.size}`;
  };

  return (
    <>
      <div className="space-y-3">
        {/* Drop zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${
              isDragging
                ? "border-relay-orange bg-relay-orange/5"
                : "border-gray-300 dark:border-gray-600 hover:border-relay-orange/50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-relay-orange animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uploading... {uploadProgress}%
              </p>
              <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-relay-orange h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload
                className={`w-8 h-8 ${
                  isDragging ? "text-relay-orange" : "text-gray-400"
                }`}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-relay-orange">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Max {maxFiles} files, up to {maxSizeMB}MB each. You can also
                paste images.
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        {/* File list with thumbnails */}
        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((file, index) => {
              const thumbnailKey = getThumbnailKey(file, index);
              const thumbnailUrl = thumbnails.get(thumbnailKey);
              const isImage = file.type.startsWith("image/");

              return (
                <div
                  key={thumbnailKey}
                  className="relative group bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Thumbnail or file icon */}
                  {isImage && thumbnailUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(thumbnailUrl);
                      }}
                      className="w-full aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-relay-orange focus:ring-inset"
                    >
                      <img
                        src={thumbnailUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">
                          Click to expand
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center">
                      <FileIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* File info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-white/70">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Remove button */}
                  {onFileRemove && !isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileRemove(index);
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Full-size image */}
          <img
            src={lightboxUrl}
            alt="Full size preview"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Instructions */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            Click outside or press Escape to close
          </p>
        </div>
      )}
    </>
  );
}
