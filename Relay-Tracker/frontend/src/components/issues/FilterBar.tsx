import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Filter, SlidersHorizontal, User } from "lucide-react";
import type {
  IssueType,
  IssuePriority,
  IssueStatus,
  Tool,
  FilterMode,
  FilterModes,
} from "../../types";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "../../types";
import { useAuth } from "../../hooks/useAuth";

interface FilterBarProps {
  selectedStatuses: IssueStatus[];
  selectedPriorities: IssuePriority[];
  selectedTypes: IssueType[];
  selectedTools?: Tool[];
  filterModes?: FilterModes;
  onStatusChange: (statuses: IssueStatus[]) => void;
  onPriorityChange: (priorities: IssuePriority[]) => void;
  onTypeChange: (types: IssueType[]) => void;
  onToolChange?: (tools: Tool[]) => void;
  onFilterModeChange?: (category: keyof FilterModes, mode: FilterMode) => void;
  onClearAll: () => void;
  onMyIssues?: () => void;
}

// Jira workflow statuses
const STATUS_OPTIONS: IssueStatus[] = Object.keys(
  STATUS_CONFIG
) as IssueStatus[];
const PRIORITY_OPTIONS: IssuePriority[] = Object.keys(
  PRIORITY_CONFIG
) as IssuePriority[];
const TYPE_OPTIONS: IssueType[] = ["Bug", "Task", "Story"];

// Type colors
const typeColors: Record<IssueType, string> = {
  Bug: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Task: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Story: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

// Tool colors
const toolColors: Record<Tool, string> = {
  AI: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Curator: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Metadata:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  AutoEat: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  Himera: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Mobile App": "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  MenuCurator:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  Reports:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

// Tool options for filtering by project/label
const TOOL_OPTIONS: Tool[] = [
  "AI",
  "Curator",
  "Metadata",
  "AutoEat",
  "Himera",
  "Mobile App",
  "MenuCurator",
  "Reports",
];

// Helper to get color classes from shared config
const getStatusColorClass = (status: string) => {
  return (
    STATUS_CONFIG[status]?.colorClass ||
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
  );
};

const getPriorityColorClass = (priority: IssuePriority) => {
  return (
    PRIORITY_CONFIG[priority]?.colorClass ||
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
  );
};

// Type colors

interface MultiSelectDropdownProps<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  getColorClass?: (option: T) => string;
  getLabel?: (option: T) => string;
  filterMode?: FilterMode;
  onFilterModeChange?: (mode: FilterMode) => void;
}

function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  getColorClass,
  getLabel,
  filterMode = "is",
  onFilterModeChange,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<"left" | "right">(
    "left"
  );

  // Calculate dropdown position to prevent overflow
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px
      const spaceOnRight = window.innerWidth - buttonRect.left;

      // If not enough space on right, align to right edge of button
      if (spaceOnRight < dropdownWidth + 16) {
        setDropdownPosition("right");
      } else {
        setDropdownPosition("left");
      }
    }
  }, [isOpen]);

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

  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const isExcludeMode = filterMode === "is_not";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
          selected.length > 0
            ? isExcludeMode
              ? "border-red-400 bg-red-50 text-red-600 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400"
              : "border-relay-orange bg-relay-orange/10 text-relay-orange"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
        }`}
      >
        {selected.length > 0 && isExcludeMode && (
          <span className="text-xs font-semibold">NOT</span>
        )}
        <span>{label}</span>
        {selected.length > 0 && (
          <span
            className={`flex items-center justify-center w-5 h-5 text-xs font-medium text-white rounded-full ${
              isExcludeMode ? "bg-red-500" : "bg-relay-orange"
            }`}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 ${
            dropdownPosition === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* IS / IS NOT Toggle */}
          {onFilterModeChange && (
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                <button
                  onClick={() => onFilterModeChange("is")}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filterMode === "is"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  IS
                </button>
                <button
                  onClick={() => onFilterModeChange("is_not")}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filterMode === "is_not"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  IS NOT
                </button>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selected.includes(option)
                      ? isExcludeMode
                        ? "bg-red-500 border-red-500"
                        : "bg-relay-orange border-relay-orange"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selected.includes(option) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium truncate ${
                    getColorClass
                      ? getColorClass(option)
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {getLabel ? getLabel(option) : option}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_FILTER_MODES: FilterModes = {
  status: "is",
  priority: "is",
  type: "is",
  tool: "is",
};

export function FilterBar({
  selectedStatuses,
  selectedPriorities,
  selectedTypes,
  selectedTools = [],
  filterModes = DEFAULT_FILTER_MODES,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onToolChange,
  onFilterModeChange,
  onClearAll,
  onMyIssues,
}: FilterBarProps) {
  const { user } = useAuth();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const totalFilters =
    selectedStatuses.length +
    selectedPriorities.length +
    selectedTypes.length +
    selectedTools.length;

  // Check if specific quick filters are active
  const isMyIssuesActive = false; // Would need reporter filter from parent
  const isHighPriorityActive =
    selectedPriorities.length === 2 &&
    selectedPriorities.includes("Highest") &&
    selectedPriorities.includes("High");
  const isOpenActive =
    selectedStatuses.length > 0 &&
    selectedStatuses.every((s) =>
      ["SQA INVESTIGATION", "TO DO", "IN PROGRESS", "REOPENED"].includes(s)
    );

  // Quick filter handlers
  const handleHighPriorityFilter = () => {
    if (isHighPriorityActive) {
      onPriorityChange([]);
    } else {
      onPriorityChange(["Highest", "High"]);
    }
  };

  const handleOpenFilter = () => {
    if (isOpenActive) {
      onStatusChange([]);
    } else {
      onStatusChange(["SQA INVESTIGATION", "TO DO", "IN PROGRESS", "REOPENED"]);
    }
  };

  const handleBugsFilter = () => {
    if (selectedTypes.includes("Bug") && selectedTypes.length === 1) {
      onTypeChange([]);
    } else {
      onTypeChange(["Bug"]);
    }
  };

  const isBugsActive =
    selectedTypes.length === 1 && selectedTypes.includes("Bug");

  return (
    <>
      {/* Mobile: Horizontal scrollable filter chips */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {/* My Issues chip */}
          {onMyIssues && user && (
            <button
              onClick={onMyIssues}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                isMyIssuesActive
                  ? "bg-relay-orange text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              My Issues
            </button>
          )}

          {/* High Priority chip */}
          <button
            onClick={handleHighPriorityFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              isHighPriorityActive
                ? "bg-red-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            🔥 High Priority
          </button>

          {/* Open Issues chip */}
          <button
            onClick={handleOpenFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              isOpenActive
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            📋 Open
          </button>

          {/* Bugs Only chip */}
          <button
            onClick={handleBugsFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              isBugsActive
                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-2 ring-red-500"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            🐛 Bugs
          </button>

          {/* More filters chip */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              totalFilters > 0
                ? "bg-relay-orange/10 text-relay-orange ring-2 ring-relay-orange"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            More
            {totalFilters > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-relay-orange text-white rounded-full">
                {totalFilters}
              </span>
            )}
          </button>

          {/* Clear all chip (only when filters active) */}
          {totalFilters > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-red-500 dark:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Bottom sheet for full filters */}
      {showMobileFilters && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileFilters(false)}
          />

          {/* Bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Filters
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter sections */}
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        if (selectedStatuses.includes(status)) {
                          onStatusChange(
                            selectedStatuses.filter((s) => s !== status)
                          );
                        } else {
                          onStatusChange([...selectedStatuses, status]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        selectedStatuses.includes(status)
                          ? getStatusColorClass(status) +
                            " ring-2 ring-relay-orange"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {STATUS_CONFIG[status]?.label || status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        if (selectedPriorities.includes(priority)) {
                          onPriorityChange(
                            selectedPriorities.filter((p) => p !== priority)
                          );
                        } else {
                          onPriorityChange([...selectedPriorities, priority]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        selectedPriorities.includes(priority)
                          ? getPriorityColorClass(priority) +
                            " ring-2 ring-relay-orange"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {PRIORITY_CONFIG[priority]?.icon}{" "}
                      {PRIORITY_CONFIG[priority]?.label || priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        if (selectedTypes.includes(type)) {
                          onTypeChange(selectedTypes.filter((t) => t !== type));
                        } else {
                          onTypeChange([...selectedTypes, type]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        selectedTypes.includes(type)
                          ? typeColors[type] + " ring-2 ring-relay-orange"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool */}
              {onToolChange && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tool
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOOL_OPTIONS.map((tool) => (
                      <button
                        key={tool}
                        onClick={() => {
                          if (selectedTools.includes(tool)) {
                            onToolChange(
                              selectedTools.filter((t) => t !== tool)
                            );
                          } else {
                            onToolChange([...selectedTools, tool]);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          selectedTools.includes(tool)
                            ? toolColors[tool] + " ring-2 ring-relay-orange"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onClearAll();
                  setShowMobileFilters(false);
                }}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-relay-gradient rounded-xl hover:opacity-90 transition-opacity"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: Original filter dropdowns */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        {/* Filter icon and label */}
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectDropdown
            label="Status"
            options={STATUS_OPTIONS}
            selected={selectedStatuses}
            onChange={onStatusChange}
            getColorClass={getStatusColorClass}
            getLabel={(s) => STATUS_CONFIG[s]?.label || s}
            filterMode={filterModes.status}
            onFilterModeChange={
              onFilterModeChange
                ? (mode) => onFilterModeChange("status", mode)
                : undefined
            }
          />

          <MultiSelectDropdown
            label="Priority"
            options={PRIORITY_OPTIONS}
            selected={selectedPriorities}
            onChange={onPriorityChange}
            getColorClass={getPriorityColorClass}
            getLabel={(p) =>
              `${PRIORITY_CONFIG[p]?.icon} ${PRIORITY_CONFIG[p]?.label}`
            }
            filterMode={filterModes.priority}
            onFilterModeChange={
              onFilterModeChange
                ? (mode) => onFilterModeChange("priority", mode)
                : undefined
            }
          />

          <MultiSelectDropdown
            label="Type"
            options={TYPE_OPTIONS}
            selected={selectedTypes}
            onChange={onTypeChange}
            getColorClass={(t) => typeColors[t]}
            filterMode={filterModes.type}
            onFilterModeChange={
              onFilterModeChange
                ? (mode) => onFilterModeChange("type", mode)
                : undefined
            }
          />

          {onToolChange && (
            <MultiSelectDropdown
              label="Tool"
              options={TOOL_OPTIONS}
              selected={selectedTools}
              onChange={onToolChange}
              getColorClass={(t) => toolColors[t]}
              filterMode={filterModes.tool}
              onFilterModeChange={
                onFilterModeChange
                  ? (mode) => onFilterModeChange("tool", mode)
                  : undefined
              }
            />
          )}
        </div>

        {/* Clear all button */}
        {totalFilters > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear all ({totalFilters})
          </button>
        )}
      </div>
    </>
  );
}
