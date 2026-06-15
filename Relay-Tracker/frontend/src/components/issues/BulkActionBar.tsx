import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import type { IssueStatus, IssuePriority } from '../../types';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onApplyStatus: (status: IssueStatus) => Promise<void>;
  onApplyPriority?: (priority: IssuePriority) => Promise<void>;
  isLoading?: boolean;
}

// Status options matching Jira workflow
const AVAILABLE_STATUSES: IssueStatus[] = [
  'SQA INVESTIGATION',
  'TO DO',
  'SELECTED FOR DEVELOPMENT',
  'IN PROGRESS',
  'DEV COMPLETE',
  'DEPLOYED TO DEV',
  'QA',
  'QA IN PROGRESS',
  'QA PASSED',
  'DONE',
  'CANCELLED',
];

const AVAILABLE_PRIORITIES: IssuePriority[] = [
  'Highest',
  'High',
  'Medium',
  'Low',
  'Lowest',
];

// Priority colors
const priorityColors: Record<IssuePriority, string> = {
  Highest: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Lowest: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

type ActionType = 'status' | 'priority' | null;

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onApplyStatus,
  onApplyPriority,
  isLoading = false,
}: BulkActionBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<ActionType>(null);
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<IssuePriority | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyStatus = async () => {
    if (!selectedStatus) return;
    await onApplyStatus(selectedStatus);
    setSelectedStatus(null);
    setActiveDropdown(null);
  };

  const handleApplyPriority = async () => {
    if (!selectedPriority || !onApplyPriority) return;
    await onApplyPriority(selectedPriority);
    setSelectedPriority(null);
    setActiveDropdown(null);
  };

  if (selectedCount === 0) return null;

  // Warning for soft limit
  const showWarning = selectedCount > 50;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)]">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700">
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${showWarning ? 'bg-yellow-500' : 'bg-relay-orange'}`}>
            {selectedCount}
          </div>
          <span className="text-sm font-medium text-white whitespace-nowrap">
            issue{selectedCount !== 1 ? 's' : ''} selected
          </span>
          {showWarning && (
            <span className="text-xs text-yellow-400" title="Consider selecting fewer issues for better performance">
              ⚠️
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-gray-700" />

        {/* Status dropdown */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <span className="whitespace-nowrap">{selectedStatus || 'Change Status'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
          </button>

          {activeDropdown === 'status' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
              {AVAILABLE_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setSelectedStatus(status);
                    setActiveDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedStatus === status ? 'bg-relay-orange/10 text-relay-orange' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {selectedStatus === status && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  <span className={selectedStatus === status ? '' : 'ml-6'}>{status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority dropdown */}
        {onApplyPriority && (
          <div className="relative" ref={priorityDropdownRef}>
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <span className="whitespace-nowrap">{selectedPriority || 'Change Priority'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'priority' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'priority' && (
              <div className="absolute bottom-full left-0 mb-2 w-48 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                {AVAILABLE_PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    onClick={() => {
                      setSelectedPriority(priority);
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedPriority === priority ? 'bg-relay-orange/10' : ''
                    }`}
                  >
                    {selectedPriority === priority && <CheckCircle className="w-4 h-4 text-relay-orange flex-shrink-0" />}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority]} ${selectedPriority !== priority ? 'ml-6' : ''}`}>
                      {priority}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Apply button */}
        {(selectedStatus || selectedPriority) && (
          <button
            onClick={selectedStatus ? handleApplyStatus : handleApplyPriority}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-relay-gradient rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Applying...</span>
              </>
            ) : (
              <>
                Apply {selectedStatus ? 'Status' : 'Priority'}
              </>
            )}
          </button>
        )}

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          disabled={isLoading}
          className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Clear selection (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
