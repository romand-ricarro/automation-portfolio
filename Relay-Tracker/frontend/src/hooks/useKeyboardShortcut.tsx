import { useEffect, useCallback, useRef, useState } from "react";

type KeyHandler = () => void;
type Key = string;

interface ShortcutOptions {
  /**
   * Whether the shortcut should work when an input field is focused.
   * Default: false (shortcuts are disabled in input fields)
   */
  enableInInput?: boolean;

  /**
   * Modifier keys required (Cmd on Mac, Ctrl on Windows/Linux)
   */
  cmdOrCtrl?: boolean;

  /**
   * Shift key required
   */
  shift?: boolean;

  /**
   * Alt key required
   */
  alt?: boolean;

  /**
   * Whether to prevent default browser behavior
   */
  preventDefault?: boolean;
}

// Detect Mac vs other OS for modifier key handling
const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Check if an element is an input field where typing should be allowed
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;

  const tagName = target.tagName.toLowerCase();
  const isInput =
    tagName === "input" || tagName === "textarea" || tagName === "select";
  const isContentEditable = target.getAttribute("contenteditable") === "true";

  return isInput || isContentEditable;
}

/**
 * Hook for registering a single keyboard shortcut
 */
export function useKeyboardShortcut(
  keys: Key | Key[],
  handler: KeyHandler,
  options: ShortcutOptions = {}
): void {
  const {
    enableInInput = false,
    cmdOrCtrl = false,
    shift = false,
    alt = false,
    preventDefault = true,
  } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const keySequence = Array.isArray(keys) ? keys : [keys];
    let sequenceIndex = 0;
    let sequenceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if in input field (unless enabled)
      if (!enableInInput && isInputElement(event.target)) {
        // Always allow Escape in input fields
        if (event.key !== "Escape") {
          sequenceIndex = 0;
          return;
        }
      }

      // Check modifier keys
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      if (cmdOrCtrl && !modifierKey) return;
      if (shift && !event.shiftKey) return;
      if (alt && !event.altKey) return;

      // For single key shortcuts
      if (keySequence.length === 1) {
        if (event.key.toLowerCase() === keySequence[0].toLowerCase()) {
          if (preventDefault) event.preventDefault();
          handlerRef.current();
        }
        return;
      }

      // For key sequences (like g then h)
      const currentKey = event.key.toLowerCase();
      const expectedKey = keySequence[sequenceIndex].toLowerCase();

      if (currentKey === expectedKey) {
        sequenceIndex++;

        // Clear any existing timer
        if (sequenceTimer) clearTimeout(sequenceTimer);

        if (sequenceIndex === keySequence.length) {
          // Full sequence matched
          if (preventDefault) event.preventDefault();
          handlerRef.current();
          sequenceIndex = 0;
        } else {
          // Wait for next key in sequence (500ms timeout)
          sequenceTimer = setTimeout(() => {
            sequenceIndex = 0;
          }, 500);
        }
      } else {
        // Wrong key, reset sequence
        sequenceIndex = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimer) clearTimeout(sequenceTimer);
    };
  }, [keys, enableInInput, cmdOrCtrl, shift, alt, preventDefault]);
}

/**
 * Shortcut definitions for the help modal
 */
export interface ShortcutDefinition {
  keys: string[];
  description: string;
  category: "navigation" | "list" | "detail" | "form" | "global";
}

export const SHORTCUTS: ShortcutDefinition[] = [
  // Global shortcuts
  {
    keys: ["Cmd/Ctrl", "k"],
    description: "Open command palette",
    category: "global",
  },
  { keys: ["c"], description: "Create new issue", category: "global" },
  { keys: ["/"], description: "Focus search", category: "global" },
  { keys: ["?"], description: "Show keyboard shortcuts", category: "global" },
  { keys: ["Esc"], description: "Close modal/dialog", category: "global" },

  // Navigation
  { keys: ["g", "h"], description: "Go to Home", category: "navigation" },
  { keys: ["g", "i"], description: "Go to Issues", category: "navigation" },
  {
    keys: ["g", "a"],
    description: "Go to Admin (admin only)",
    category: "navigation",
  },

  // Issue list
  { keys: ["↑", "↓"], description: "Navigate issues", category: "list" },
  {
    keys: ["j", "k"],
    description: "Navigate issues (vim style)",
    category: "list",
  },
  { keys: ["Enter"], description: "Open selected issue", category: "list" },
  { keys: ["r"], description: "Refresh list", category: "list" },
  { keys: ["f"], description: "Toggle filters", category: "list" },
  { keys: ["x"], description: "Select/deselect issue", category: "list" },
  { keys: ["Shift", "x"], description: "Select all issues", category: "list" },

  // Issue detail
  { keys: ["e"], description: "Edit issue", category: "detail" },
  { keys: ["m"], description: "Add comment", category: "detail" },
  { keys: ["a"], description: "Add attachment", category: "detail" },
  { keys: ["d"], description: "Delete issue (admin only)", category: "detail" },

  // Form shortcuts
  { keys: ["Cmd/Ctrl", "Enter"], description: "Submit form", category: "form" },
  { keys: ["Esc"], description: "Cancel/close form", category: "form" },
];

/**
 * Format keys for display (handle Mac vs Windows)
 */
export function formatShortcutKeys(keys: string[]): string {
  return keys
    .map((key) => {
      if (key === "Cmd/Ctrl") return isMac ? "⌘" : "Ctrl";
      if (key === "Shift") return isMac ? "⇧" : "Shift";
      if (key === "Alt") return isMac ? "⌥" : "Alt";
      if (key === "Enter") return "↵";
      if (key === "Esc") return "Esc";
      if (key === "↑") return "↑";
      if (key === "↓") return "↓";
      return key.toUpperCase();
    })
    .join(
      keys.length > 1 && !keys.includes("Shift") && !keys.includes("Cmd/Ctrl")
        ? " → "
        : " + "
    );
}

/**
 * Hook for managing keyboard navigation in a list
 */
export function useListNavigation<T>(
  items: T[],
  options: {
    onSelect?: (item: T, index: number) => void;
    enabled?: boolean;
  } = {}
): {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
} {
  const { onSelect, enabled = true } = options;
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const navigateUp = useCallback(() => {
    if (!enabled || items.length === 0) return;
    setSelectedIndex((prev) => {
      const newIndex = prev <= 0 ? items.length - 1 : prev - 1;
      return newIndex;
    });
  }, [enabled, items.length]);

  const navigateDown = useCallback(() => {
    if (!enabled || items.length === 0) return;
    setSelectedIndex((prev) => {
      const newIndex = prev >= items.length - 1 ? 0 : prev + 1;
      return newIndex;
    });
  }, [enabled, items.length]);

  const selectCurrent = useCallback(() => {
    if (!enabled || selectedIndex < 0 || selectedIndex >= items.length) return;
    onSelect?.(items[selectedIndex], selectedIndex);
  }, [enabled, selectedIndex, items, onSelect]);

  // Arrow keys
  useKeyboardShortcut("ArrowUp", navigateUp);
  useKeyboardShortcut("ArrowDown", navigateDown);

  // Vim-style navigation
  useKeyboardShortcut("k", navigateUp);
  useKeyboardShortcut("j", navigateDown);

  // Selection
  useKeyboardShortcut("Enter", selectCurrent);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [items]);

  return { selectedIndex, setSelectedIndex };
}

/**
 * Hook that provides global keyboard shortcuts context
 */
export function useGlobalShortcuts(options: {
  onCreateIssue?: () => void;
  onFocusSearch?: () => void;
  onShowHelp?: () => void;
  onNavigateHome?: () => void;
  onNavigateIssues?: () => void;
  onNavigateAdmin?: () => void;
  onRefresh?: () => void;
  enabled?: boolean;
}): void {
  const {
    onCreateIssue,
    onFocusSearch,
    onShowHelp,
    onNavigateHome,
    onNavigateIssues,
    onNavigateAdmin,
    onRefresh,
    enabled = true,
  } = options;

  // Create new issue (C)
  useKeyboardShortcut("c", () => {
    if (enabled && onCreateIssue) onCreateIssue();
  });

  // Focus search (/)
  useKeyboardShortcut(
    "/",
    () => {
      if (enabled && onFocusSearch) onFocusSearch();
    },
    { preventDefault: true }
  );

  // Show help (?)
  useKeyboardShortcut(
    "?",
    () => {
      if (enabled && onShowHelp) onShowHelp();
    },
    { shift: true }
  );

  // Navigation: G then H for Home
  useKeyboardShortcut(["g", "h"], () => {
    if (enabled && onNavigateHome) onNavigateHome();
  });

  // Navigation: G then I for Issues
  useKeyboardShortcut(["g", "i"], () => {
    if (enabled && onNavigateIssues) onNavigateIssues();
  });

  // Navigation: G then A for Admin
  useKeyboardShortcut(["g", "a"], () => {
    if (enabled && onNavigateAdmin) onNavigateAdmin();
  });

  // Refresh (R)
  useKeyboardShortcut("r", () => {
    if (enabled && onRefresh) onRefresh();
  });
}
