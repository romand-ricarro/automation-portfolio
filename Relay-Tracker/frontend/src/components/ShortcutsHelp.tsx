import { useState, useEffect } from 'react';
import { X, Search, Keyboard, Navigation, List, FileText, FormInput } from 'lucide-react';
import { SHORTCUTS, formatShortcutKeys, type ShortcutDefinition, useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons = {
  global: Keyboard,
  navigation: Navigation,
  list: List,
  detail: FileText,
  form: FormInput,
};

const categoryLabels = {
  global: 'Global',
  navigation: 'Navigation',
  list: 'Issue List',
  detail: 'Issue Detail',
  form: 'Forms',
};

const categoryOrder: ShortcutDefinition['category'][] = [
  'global',
  'navigation',
  'list',
  'detail',
  'form',
];

function ShortcutRow({ shortcut }: { shortcut: ShortcutDefinition }) {
  return (
    <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <span key={index}>
            {index > 0 && !['Shift', 'Cmd/Ctrl', 'Alt'].includes(shortcut.keys[index - 1]) && (
              <span className="text-xs text-gray-400 mx-0.5">then</span>
            )}
            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300">
              {formatShortcutKeys([key])}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: ShortcutDefinition['category'] }) {
  const Icon = categoryIcons[category];
  const shortcuts = SHORTCUTS.filter(s => s.category === category);

  if (shortcuts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-relay-orange" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {categoryLabels[category]}
        </h3>
      </div>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut, index) => (
          <ShortcutRow key={index} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useKeyboardShortcut('Escape', onClose, { enableInInput: true });

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter shortcuts based on search
  const filteredShortcuts = searchQuery
    ? SHORTCUTS.filter(
        s =>
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.keys.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-relay-gradient">
                <Keyboard className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-relay-orange/50 focus:border-relay-orange"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] px-6 py-4">
          {filteredShortcuts ? (
            // Search results
            filteredShortcuts.length > 0 ? (
              <div className="space-y-0.5">
                {filteredShortcuts.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No shortcuts found for "{searchQuery}"
                </p>
              </div>
            )
          ) : (
            // Categorized view
            categoryOrder.map(category => (
              <CategorySection key={category} category={category} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> to toggle this menu
            </span>
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * First-time user tooltip for keyboard shortcuts
 */
export function ShortcutsHint({ onDismiss }: { onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('relay_seen_shortcuts_hint');
    if (hasSeenHint) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('relay_seen_shortcuts_hint', 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-fade-in">
      <div className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
        <div className="flex items-start gap-3">
          <Keyboard className="w-5 h-5 text-relay-orange flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Keyboard shortcuts available</p>
            <p className="text-xs text-gray-300 mt-1">
              Press <kbd className="px-1 py-0.5 bg-gray-700 dark:bg-gray-600 rounded">?</kbd> to see all shortcuts
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
