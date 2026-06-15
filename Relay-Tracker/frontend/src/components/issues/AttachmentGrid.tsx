import { useState, useEffect } from "react";
import { Link2, File as FileIcon, X, ExternalLink } from "lucide-react";
import type { Attachment } from "../../types";

interface AttachmentGridProps {
  attachments: Attachment[];
}

// Image file extensions
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];

// Image MIME types
const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
];

/**
 * Check if an attachment is an image based on filename or MIME type
 */
function isImageAttachment(attachment: Attachment): boolean {
  // Check MIME type first
  if (attachment.mimeType && IMAGE_MIME_TYPES.includes(attachment.mimeType)) {
    return true;
  }

  // Fallback to filename extension
  const filename = attachment.filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Single attachment card component
 */
function AttachmentCard({
  attachment,
  onImageClick,
}: {
  attachment: Attachment;
  onImageClick: (url: string, filename: string) => void;
}) {
  const isImage = isImageAttachment(attachment);
  const [imageError, setImageError] = useState(false);

  if (isImage && !imageError) {
    return (
      <div className="group relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange transition-colors">
        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => onImageClick(attachment.content, attachment.filename)}
          className="w-full aspect-[4/3] cursor-pointer focus:outline-none focus:ring-2 focus:ring-relay-orange focus:ring-inset"
        >
          <img
            src={attachment.content}
            alt={attachment.filename}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full transition-opacity">
              Click to preview
            </span>
          </div>
        </button>

        {/* File info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="text-xs text-white truncate font-medium">
            {attachment.filename}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-white/70">
              {formatFileSize(attachment.size)}
            </p>
            {attachment.storage === "r2" && (
              <span className="px-1.5 py-0.5 rounded-md bg-relay-orange/20 text-[10px] font-bold text-relay-orange uppercase tracking-wider">
                Cloud
              </span>
            )}
          </div>
        </div>

        {/* Open in new tab button */}
        <a
          href={attachment.content}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
          title="Open in new tab"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // Non-image file card (or image that failed to load)
  return (
    <a
      href={attachment.content}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange transition-colors bg-gray-50 dark:bg-gray-800"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        {imageError ? (
          <Link2 className="w-5 h-5 text-gray-400" />
        ) : (
          <FileIcon className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {attachment.filename}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">
            {formatFileSize(attachment.size)}
          </p>
          {attachment.storage === "r2" && (
            <span className="px-1.5 py-0.5 rounded-md bg-relay-orange/10 text-[10px] font-bold text-relay-orange uppercase tracking-wider">
              Cloud
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-relay-orange transition-colors" />
    </a>
  );
}

/**
 * Lightbox component for full-size image preview
 */
function ImageLightbox({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename: string;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    // Use capture phase to intercept before other handlers
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Open in new tab button */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        title="Open in new tab"
      >
        <ExternalLink className="w-6 h-6" />
      </a>

      {/* Full-size image */}
      <img
        src={url}
        alt={filename}
        className="max-w-[90vw] max-h-[85vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Filename and instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-white font-medium mb-1">{filename}</p>
        <p className="text-white/60 text-sm">
          Click outside or press Escape to close
        </p>
      </div>
    </div>
  );
}

/**
 * Attachment grid with thumbnails for images and lightbox preview
 */
export function AttachmentGrid({ attachments }: AttachmentGridProps) {
  const [lightbox, setLightbox] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const handleImageClick = (url: string, filename: string) => {
    setLightbox({ url, filename });
  };

  const closeLightbox = () => {
    setLightbox(null);
  };

  // Separate images and other files for better layout
  const imageAttachments = attachments.filter(
    (a) => isImageAttachment(a)
  );
  const otherAttachments = attachments.filter(
    (a) => !isImageAttachment(a)
  );

  return (
    <>
      <div className="space-y-4">
        {/* Image attachments in a grid */}
        {imageAttachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {imageAttachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onImageClick={handleImageClick}
              />
            ))}
          </div>
        )}

        {/* Other attachments in a list */}
        {otherAttachments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherAttachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onImageClick={handleImageClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox
          url={lightbox.url}
          filename={lightbox.filename}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
