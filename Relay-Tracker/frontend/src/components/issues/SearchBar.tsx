import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showShortcutHint?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      onChange,
      placeholder = 'Search issues...',
      debounceMs = 300,
      showShortcutHint = true,
    },
    ref
  ) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    // Sync local value when external value changes
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Debounced onChange
    useEffect(() => {
      const timer = setTimeout(() => {
        if (localValue !== value) {
          onChange(localValue);
        }
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [localValue, value, onChange, debounceMs]);

    const handleClear = useCallback(() => {
      setLocalValue('');
      onChange('');
    }, [onChange]);

    return (
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={ref}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-16 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-relay-orange/50 focus:border-relay-orange transition-colors"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {localValue && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showShortcutHint && !isFocused && !localValue && (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              /
            </kbd>
          )}
        </div>
      </div>
    );
  }
);
