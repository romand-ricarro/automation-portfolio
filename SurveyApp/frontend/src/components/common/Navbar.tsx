import React, { useState, useRef, useEffect } from "react";
import { Menu, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { DarkModeToggle } from "./DarkModeToggle";

interface NavbarProps {
  onMenuClick: () => void;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, className }) => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className={`bg-white dark:bg-surface border-b border-gray-200 dark:border-white/5 h-16 fixed w-full top-0 z-30 transition-colors duration-200 ${
        className || ""
      }`}
    >
      <div className="px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 lg:hidden transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl font-bold bg-gradient-pulse bg-clip-text text-transparent">
            InsightPulse
          </span>
        </div>

        <div className="flex items-center gap-4">
          <DarkModeToggle />

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user.role}
                </p>
              </div>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                >
                  {user.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border-2 border-primary/20 dark:border-primary/30 transition-all hover:border-primary/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-surface-elevated flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/10 transition-colors">
                      <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface rounded-bento shadow-lg dark:shadow-bento py-1 border border-gray-200 dark:border-white/5 z-50">
                    <button
                      onClick={() => {
                        signOut();
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 w-full transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
