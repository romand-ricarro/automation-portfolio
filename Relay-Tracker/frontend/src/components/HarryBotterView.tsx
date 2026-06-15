import { useState } from "react";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";

const HARRY_BOTTER_URL = "https://harrybotter-portal.vercel.app/chat";

export function HarryBotterView() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    // Force iframe reload by changing key
    const iframe = document.getElementById(
      "harry-botter-iframe",
    ) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-botter-gradient flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Harry Botter Portal
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tech Tools Ticket Hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <a
            href={HARRY_BOTTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </a>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 relative bg-white dark:bg-gray-900 rounded-b-xl overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-botter-primary animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading Harry Botter Portal...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-3xl">😵</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Unable to load Harry Botter
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  The portal may be temporarily unavailable or blocked by your
                  browser.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 text-sm font-medium bg-botter-gradient text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
                <a
                  href={HARRY_BOTTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          id="harry-botter-iframe"
          src={HARRY_BOTTER_URL}
          className={`w-full h-full border-0 ${isLoading || hasError ? "invisible" : "visible"}`}
          title="Harry Botter Portal"
          onLoad={handleLoad}
          onError={handleError}
          allow="clipboard-write; clipboard-read"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
