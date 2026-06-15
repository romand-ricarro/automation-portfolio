import React from "react";
import { AlertCircle } from "lucide-react";

export const EnvironmentBanner: React.FC = () => {
  // VITE_APP_ENV should be set to 'production' in the main deployment
  // Any other value (staging, development, etc.) will trigger the banner
  const env = import.meta.env.VITE_APP_ENV || "development";

  if (env === "production") return null;

  return (
    <div className="bg-amber-500 text-white h-8 py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 z-[100] fixed top-0 w-full animate-in fade-in slide-in-from-top duration-500">
      <AlertCircle className="w-4 h-4" />
      <span>
        Staging Environment: Data shown here is for testing purposes and may be
        removed without notice.
      </span>
    </div>
  );
};
