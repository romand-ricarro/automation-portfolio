import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { EnvironmentBanner } from "./EnvironmentBanner";

export const Layout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isStaging =
    (import.meta.env.VITE_APP_ENV || "development") !== "production";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-deep-bg transition-colors duration-200">
      <EnvironmentBanner />
      <Navbar
        onMenuClick={() => setSidebarOpen(true)}
        className={isStaging ? "!top-8" : ""}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        className={isStaging ? "!top-[96px] !h-[calc(100vh-6rem)]" : ""}
      />

      <main
        className={clsx(
          "lg:pl-64 pt-16 min-h-screen relative",
          isStaging && "pt-24"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
