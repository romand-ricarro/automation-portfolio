import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { IssueStatus } from "../../types";

interface StatusDropdownProps {
  value: IssueStatus | null;
  onChange: (status: IssueStatus) => void;
}

// Jira workflow statuses
const STATUS_OPTIONS: IssueStatus[] = [
  "SQA INVESTIGATION",
  "TO DO",
  "SELECTED FOR DEVELOPMENT",
  "REOPENED",
  "IN PROGRESS",
  "DEV COMPLETE",
  "DEPLOYED TO DEV",
  "QA",
  "QA IN PROGRESS",
  "QA PASSED",
  "CANCELLED",
  "DONE",
];

const statusColors: Record<string, { bg: string; text: string }> = {
  "SQA INVESTIGATION": {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
  },
  "TO DO": {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-800 dark:text-gray-300",
  },
  "SELECTED FOR DEVELOPMENT": {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
  },
  "REOPENED": {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-800 dark:text-orange-300",
  },
  "IN PROGRESS": {
    bg: "bg-blue-600 dark:bg-blue-600",
    text: "text-white dark:text-white",
  },
  "DEV COMPLETE": {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-300",
  },
  "DEPLOYED TO DEV": {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-800 dark:text-cyan-300",
  },
  "QA": {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-800 dark:text-pink-300",
  },
  "QA IN PROGRESS": {
    bg: "bg-pink-600 dark:bg-pink-600",
    text: "text-white dark:text-white",
  },
  "QA PASSED": {
    bg: "bg-green-600 dark:bg-green-600",
    text: "text-white dark:text-white",
  },
  "CANCELLED": {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-500 dark:text-slate-400",
  },
  "DONE": {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
  },
  // Legacy status support
  "Open": {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  "To Do": {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-800 dark:text-gray-300",
  },
  "In Progress": {
    bg: "bg-blue-600 dark:bg-blue-600",
    text: "text-white dark:text-white",
  },
  "In Review": {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
  },
  "Done": {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
  },
  "Resolved": {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
  },
  "Cancelled": {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-500 dark:text-slate-400",
  },
  "Closed": {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-400",
  },
};

export function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (status: IssueStatus) => {
    onChange(status);
    setIsOpen(false);
  };

  const currentColors = (value && statusColors[value]) || {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-400",
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${currentColors.bg} ${currentColors.text} hover:opacity-80`}
      >
        {value || "Unknown"}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
          {STATUS_OPTIONS.map((status) => {
            const colors = statusColors[status];
            const isSelected = status === value;

            return (
              <button
                key={status}
                onClick={() => handleSelect(status)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {status}
                </span>
                {isSelected && <Check className="w-4 h-4 text-relay-orange" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
