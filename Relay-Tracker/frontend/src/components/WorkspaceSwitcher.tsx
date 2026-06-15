import { useState, useRef, useEffect } from "react";
import { Radio, Bot, ChevronDown, Check } from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  WORKSPACE_CONFIGS,
  type WorkspaceType,
} from "../context/workspace-context";

const WORKSPACE_ICONS: Record<WorkspaceType, React.ReactNode> = {
  jira: <Radio className="w-4 h-4" />,
  "harry-botter": <Bot className="w-4 h-4" />,
};

export function WorkspaceSwitcher() {
  const { activeWorkspace, setActiveWorkspace, workspaceConfig } =
    useWorkspace();
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

  const handleSelect = (workspace: WorkspaceType) => {
    setActiveWorkspace(workspace);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center text-white ${
            activeWorkspace === "jira"
              ? "bg-relay-gradient"
              : "bg-botter-gradient"
          }`}
        >
          {WORKSPACE_ICONS[activeWorkspace]}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
          {workspaceConfig.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Workspaces
            </p>
            {Object.values(WORKSPACE_CONFIGS).map((config) => (
              <button
                key={config.id}
                onClick={() => handleSelect(config.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeWorkspace === config.id
                    ? "bg-gray-100 dark:bg-gray-700"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                    config.id === "jira"
                      ? "bg-relay-gradient"
                      : "bg-botter-gradient"
                  }`}
                >
                  {WORKSPACE_ICONS[config.id]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {config.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {config.description}
                  </p>
                </div>
                {activeWorkspace === config.id && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
