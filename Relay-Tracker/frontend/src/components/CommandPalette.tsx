import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Home,
  ListTodo,
  Bug,
  Plus,
  ExternalLink,
  Command,
} from "lucide-react";
import {
  useKeyboardShortcut,
  useListNavigation,
} from "../hooks/useKeyboardShortcut";

interface CommandAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  onSelect: () => void;
  category: "navigation" | "actions" | "issues";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onOpenCreateModal: (type?: "Bug" | "Task" | "Story") => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onOpenCreateModal,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset query and focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Handle Cmd+K / Ctrl+K within the palette (to close it if needed, though useKeyboardShortcut handles global)
  // Close on Escape
  useKeyboardShortcut("Escape", onClose, { enableInInput: true });

  const staticActions: CommandAction[] = [
    {
      id: "dashboard",
      title: "Go to Dashboard",
      subtitle: "Return to the main overview",
      icon: Home,
      onSelect: () => onNavigate("/"),
      category: "navigation",
    },
    {
      id: "my-issues",
      title: "Go to My Issues",
      subtitle: "View issues you reported",
      icon: ListTodo,
      onSelect: () => onNavigate("/issues?filter=mine"),
      category: "navigation",
    },
    {
      id: "report-bug",
      title: "Report a Bug",
      subtitle: "Create a new bug issue",
      icon: Bug,
      onSelect: () => onOpenCreateModal("Bug"),
      category: "actions",
    },
    {
      id: "create-story",
      title: "Create a Story",
      subtitle: "Define a new feature requirement",
      icon: Plus,
      onSelect: () => onOpenCreateModal("Story"),
      category: "actions",
    },
  ];

  // Smart Issue Jump Logic
  const issueMatch = useMemo(() => {
    const match = query.toUpperCase().match(/([A-Z]+-\d+)/);
    return match ? match[1] : null;
  }, [query]);

  const filteredActions = useMemo(() => {
    const search = query.toLowerCase().trim();

    let results = staticActions.filter(
      (action) =>
        action.title.toLowerCase().includes(search) ||
        action.subtitle.toLowerCase().includes(search)
    );

    if (issueMatch && !results.find((r) => r.id === `issue-${issueMatch}`)) {
      results = [
        {
          id: `issue-${issueMatch}`,
          title: `Go to Issue ${issueMatch}`,
          subtitle: "Open issue details directly",
          icon: ExternalLink,
          onSelect: () => onNavigate(`/issues/${issueMatch}`),
          category: "issues",
        },
        ...results,
      ];
    }

    return results;
  }, [query, issueMatch]);

  const { selectedIndex, setSelectedIndex } = useListNavigation(
    filteredActions,
    {
      enabled: isOpen,
      onSelect: (action) => {
        action.onSelect();
        onClose();
      },
    }
  );

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            placeholder="Type a command or issue ID (e.g. FS-1234)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Command className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500">K</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filteredActions.length > 0 ? (
            <div className="space-y-1 px-2">
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${
                    index === selectedIndex
                      ? "bg-relay-orange/10 dark:bg-relay-orange/20 translate-x-1"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      index === selectedIndex
                        ? "bg-relay-orange text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={`text-sm font-semibold ${
                        index === selectedIndex
                          ? "text-relay-orange"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {action.subtitle}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-relay-orange bg-relay-orange/10 px-2 py-1 rounded-md">
                      <span>ENTER</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                No results found for "{query}"
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Try searching for "Dashboard" or "Report"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-medium uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 line-through decoration-gray-400/50">
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300">
                ↑↓
              </span>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300">
                Enter
              </span>
              Select
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300">
              Esc
            </span>
            Close
          </div>
        </div>
      </div>
    </div>
  );
}
