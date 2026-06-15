import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { IssuePriority } from '../../types';

interface PriorityDropdownProps {
  value: IssuePriority | null;
  onChange: (priority: IssuePriority) => void;
}

const PRIORITY_OPTIONS: IssuePriority[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

const priorityColors: Record<IssuePriority, string> = {
  'Highest': 'text-red-600 dark:text-red-400',
  'High': 'text-orange-500 dark:text-orange-400',
  'Medium': 'text-yellow-500 dark:text-yellow-400',
  'Low': 'text-gray-500 dark:text-gray-400',
  'Lowest': 'text-slate-400 dark:text-slate-500',
};

// Priority indicator bars
function PriorityBars({ priority }: { priority: IssuePriority }) {
  const bars: Record<IssuePriority, number> = {
    'Highest': 5,
    'High': 4,
    'Medium': 3,
    'Low': 2,
    'Lowest': 1,
  };

  const count = bars[priority];
  const color = priorityColors[priority];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-full ${i <= count ? color.replace('text-', 'bg-') : 'bg-gray-200 dark:bg-gray-700'}`}
          style={{ height: `${6 + i * 2}px` }}
        />
      ))}
    </div>
  );
}

export function PriorityDropdown({ value, onChange }: PriorityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (priority: IssuePriority) => {
    onChange(priority);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${value ? priorityColors[value] : 'text-gray-500'}`}
      >
        {value && <PriorityBars priority={value} />}
        {value || 'Unknown'}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
          {PRIORITY_OPTIONS.map((priority) => {
            const isSelected = priority === value;

            return (
              <button
                key={priority}
                onClick={() => handleSelect(priority)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PriorityBars priority={priority} />
                  <span className={priorityColors[priority]}>{priority}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-relay-orange" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
