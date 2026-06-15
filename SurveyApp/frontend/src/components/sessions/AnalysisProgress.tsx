/**
 * Real-time analysis progress component with animated progress bar.
 * Shows step-by-step progress during AI analysis.
 */
import React from "react";
import type {
  AnalysisProgress as AnalysisProgressData,
  AnalysisError,
} from "../../hooks/useAnalysisProgress";

interface AnalysisProgressProps {
  progress: AnalysisProgressData | null;
  error: AnalysisError | null;
  isAnalyzing: boolean;
  isComplete: boolean;
  isCached: boolean;
  onCancel: () => void;
  onRetry: () => void;
}

// Step definitions for display
const STEPS = [
  { key: "fetching_sheets", label: "Fetch Data" },
  { key: "processing_data", label: "Process" },
  { key: "analyzing_question", label: "Analyze" },
  { key: "generating_issues", label: "Themes" },
  { key: "saving_results", label: "Save" },
  { key: "complete", label: "Done" },
];

function getStepIndex(step: string): number {
  const index = STEPS.findIndex((s) => s.key === step);
  return index >= 0 ? index : 0;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  progress,
  error,
  isAnalyzing,
  isComplete,
  isCached,
  onCancel,
  onRetry,
}) => {
  const currentStepIndex = progress ? getStepIndex(progress.step) : 0;

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Analysis Failed
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error.error}
            </p>
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              Error code: {error.code}
            </p>
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete state
  if (isComplete && !isAnalyzing) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
              Analysis Complete!
              {isCached && (
                <span className="ml-2 text-sm font-normal text-green-600 dark:text-green-400">
                  (Cached result)
                </span>
              )}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {isCached
                ? "Retrieved from cache."
                : "All questions analyzed successfully."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Progress state
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Analyzing Session
        </h3>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>{progress?.message || "Starting analysis..."}</span>
          <span>{progress?.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progress?.progress || 0}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Step progress for questions */}
      {progress?.current !== undefined && progress?.total !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Question {progress.current} of {progress.total}
        </p>
      )}

      {/* Step indicators */}
      <div className="flex items-center justify-between mt-6">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex && isAnalyzing;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute h-0.5 w-full -ml-1/2 top-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                </div>
              )}

              {/* Step circle */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-blue-600 text-white"
                    : isCurrent
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={`mt-2 text-xs font-medium transition-colors ${
                  isCompleted || isCurrent
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Animated dots */}
      <div className="flex justify-center mt-6 gap-1">
        <span
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
};

export default AnalysisProgress;
