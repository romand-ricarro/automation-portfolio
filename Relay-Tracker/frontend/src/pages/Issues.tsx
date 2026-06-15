import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { MainLayout, showToast } from "../components";
import {
  IssueList,
  FilterBar,
  SearchBar,
  Pagination,
  BulkActionBar,
} from "../components/issues";
import { IssueDetailPage } from "./IssueDetail";
import {
  fetchIssues,
  bulkUpdateIssueStatus,
  bulkUpdateIssuePriority,
  type IssuesResponse,
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import {
  useKeyboardShortcut,
  useListNavigation,
} from "../hooks/useKeyboardShortcut";
import type {
  Issue,
  IssueType,
  IssuePriority,
  IssueStatus,
  Tool,
  FilterMode,
  FilterModes,
} from "../types";

const DEFAULT_ITEMS_PER_PAGE = 20;
const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100];

// Parse URL search params into filter state
function parseUrlFilters(): {
  statuses: IssueStatus[];
  priorities: IssuePriority[];
  types: IssueType[];
  tools: Tool[];
  search: string;
  page: number;
  limit: number;
} {
  const params = new URLSearchParams(window.location.search);

  return {
    statuses: (params.get("status")?.split(",").filter(Boolean) ||
      []) as IssueStatus[],
    priorities: (params.get("priority")?.split(",").filter(Boolean) ||
      []) as IssuePriority[],
    types: (params.get("type")?.split(",").filter(Boolean) ||
      []) as IssueType[],
    tools: (params.get("tool")?.split(",").filter(Boolean) || []) as Tool[],
    search: params.get("search") || "",
    page: parseInt(params.get("page") || "1", 10),
    limit: parseInt(params.get("limit") || String(DEFAULT_ITEMS_PER_PAGE), 10),
  };
}

// Update URL with current filters
function updateUrlFilters(filters: {
  statuses: IssueStatus[];
  priorities: IssuePriority[];
  types: IssueType[];
  tools: Tool[];
  search: string;
  page: number;
  limit: number;
}) {
  const params = new URLSearchParams();

  if (filters.statuses.length > 0)
    params.set("status", filters.statuses.join(","));
  if (filters.priorities.length > 0)
    params.set("priority", filters.priorities.join(","));
  if (filters.types.length > 0) params.set("type", filters.types.join(","));
  if (filters.tools.length > 0) params.set("tool", filters.tools.join(","));
  if (filters.search) params.set("search", filters.search);
  if (filters.page > 1) params.set("page", filters.page.toString());
  if (filters.limit !== DEFAULT_ITEMS_PER_PAGE)
    params.set("limit", filters.limit.toString());

  const newUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, "", newUrl);
}

export function IssuesPage() {
  // Initialize state from URL
  const initialFilters = parseUrlFilters();
  const { hasRole } = useAuth();

  // Only SQA and Admin can bulk edit
  const canBulkEdit = hasRole(["sqa", "admin"]);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Bulk selection state
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<Set<string>>(
    new Set()
  );

  // Filter state
  const [selectedStatuses, setSelectedStatuses] = useState<IssueStatus[]>(
    initialFilters.statuses
  );
  const [selectedPriorities, setSelectedPriorities] = useState<IssuePriority[]>(
    initialFilters.priorities
  );
  const [selectedTypes, setSelectedTypes] = useState<IssueType[]>(
    initialFilters.types
  );
  const [selectedTools, setSelectedTools] = useState<Tool[]>(
    initialFilters.tools
  );
  const [searchQuery, setSearchQuery] = useState(initialFilters.search);
  const [currentPage, setCurrentPage] = useState(initialFilters.page);
  const [itemsPerPage, setItemsPerPage] = useState(initialFilters.limit);

  // Filter modes (IS / IS NOT)
  const [filterModes, setFilterModes] = useState<FilterModes>({
    status: "is",
    priority: "is",
    type: "is",
    tool: "is",
  });

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Last updated timestamp
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Selected issue for detail view (sequential navigation)
  // Check URL on mount for direct issue link (e.g., /issues/BUG-123)
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(
    () => {
      const match = window.location.pathname.match(/^\/issues\/([A-Z]+-\d+)$/);
      return match ? match[1] : null;
    }
  );

  const { user } = useAuth();

  // Handle filter=mine on mount or query change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("filter") === "mine" && user?.email) {
      setSearchQuery(user.email);
      // Clean up the URL to prevent re-triggering if user clears search
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("filter");
      newParams.set("search", user.email);
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [user?.email]);

  // Fetch issues
  // Note: IS filters are sent to API, IS NOT filters are applied client-side
  const loadIssues = useCallback(
    async (options: { refresh?: boolean } = {}) => {
      if (options.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Only send filters to API if mode is "is" (include)
        // IS NOT filters are handled client-side after fetching
        const response: IssuesResponse = await fetchIssues(
          {
            status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
            priority:
              selectedPriorities.length > 0 ? selectedPriorities : undefined,
            type: selectedTypes.length > 0 ? selectedTypes : undefined,
            tool: selectedTools.length > 0 ? selectedTools : undefined,
            filterModes,
            search: searchQuery || undefined,
            page: currentPage,
            limit: itemsPerPage,
          },
          { refresh: options.refresh }
        );

        setIssues(response.issues);
        setTotalItems(response.total);
        setTotalPages(response.totalPages);
        setLastUpdated(new Date());

        if (options.refresh) {
          showToast({
            type: "success",
            title: "Synced with Jira",
            message: `${response.total} issue${
              response.total !== 1 ? "s" : ""
            } loaded fresh from Jira`,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issues");
        setIssues([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      selectedStatuses,
      selectedPriorities,
      selectedTypes,
      selectedTools,
      filterModes,
      searchQuery,
      currentPage,
      itemsPerPage,
    ]
  );

  // Load issues on mount and when filters change
  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Handle browser back/forward buttons for issue detail navigation
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/issues\/([A-Z]+-\d+)$/);
      setSelectedIssueKey(match ? match[1] : null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    updateUrlFilters({
      statuses: selectedStatuses,
      priorities: selectedPriorities,
      types: selectedTypes,
      tools: selectedTools,
      search: searchQuery,
      page: currentPage,
      limit: itemsPerPage,
    });
  }, [
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedTools,
    searchQuery,
    currentPage,
    itemsPerPage,
  ]);

  // Reset to page 1 when filters change (but not when page changes)
  const handleStatusChange = useCallback((statuses: IssueStatus[]) => {
    setSelectedStatuses(statuses);
    setCurrentPage(1);
  }, []);

  const handlePriorityChange = useCallback((priorities: IssuePriority[]) => {
    setSelectedPriorities(priorities);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((types: IssueType[]) => {
    setSelectedTypes(types);
    setCurrentPage(1);
  }, []);

  const handleToolChange = useCallback((tools: Tool[]) => {
    setSelectedTools(tools);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search);
    setCurrentPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedTypes([]);
    setSelectedTools([]);
    setSearchQuery("");
    setCurrentPage(1);
    // Reset filter modes to IS
    setFilterModes({
      status: "is",
      priority: "is",
      type: "is",
      tool: "is",
    });
  }, []);

  const handleFilterModeChange = useCallback(
    (category: keyof FilterModes, mode: FilterMode) => {
      setFilterModes((prev) => ({
        ...prev,
        [category]: mode,
      }));
      setCurrentPage(1);
    },
    []
  );

  // Sequential navigation helpers uses the issues directly as filtering is server-side
  const filteredIssues = issues;

  // Sequential navigation helpers
  const selectedIssueIndex = useMemo(() => {
    if (!selectedIssueKey) return -1;
    return filteredIssues.findIndex((issue) => issue.key === selectedIssueKey);
  }, [selectedIssueKey, filteredIssues]);

  const hasPreviousIssue = selectedIssueIndex > 0;
  const hasNextIssue =
    selectedIssueIndex >= 0 && selectedIssueIndex < filteredIssues.length - 1;

  const handleIssueClick = useCallback((key: string) => {
    // Set selected issue and update URL
    setSelectedIssueKey(key);
    window.history.pushState({}, "", `/issues/${key}`);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedIssueKey(null);
    window.history.pushState({}, "", "/issues");
  }, []);

  const handlePreviousIssue = useCallback(() => {
    if (hasPreviousIssue) {
      const prevIssue = filteredIssues[selectedIssueIndex - 1];
      setSelectedIssueKey(prevIssue.key);
      window.history.pushState({}, "", `/issues/${prevIssue.key}`);
    }
  }, [hasPreviousIssue, filteredIssues, selectedIssueIndex]);

  const handleNextIssue = useCallback(() => {
    if (hasNextIssue) {
      const nextIssue = filteredIssues[selectedIssueIndex + 1];
      setSelectedIssueKey(nextIssue.key);
      window.history.pushState({}, "", `/issues/${nextIssue.key}`);
    }
  }, [hasNextIssue, filteredIssues, selectedIssueIndex]);

  const handleRefresh = useCallback(() => {
    loadIssues({ refresh: true });
  }, [loadIssues]);

  const handleItemsPerPageChange = useCallback((newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  }, []);

  // Bulk selection handlers
  const handleToggleSelect = useCallback((key: string) => {
    setSelectedIssueKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) {
        // Clear selection for visible issues
        setSelectedIssueKeys((prev) => {
          const next = new Set(prev);
          issues.forEach((issue) => next.delete(issue.key));
          return next;
        });
      } else {
        // Add all visible issues to selection
        setSelectedIssueKeys((prev) => {
          const next = new Set(prev);
          keys.forEach((key) => next.add(key));
          return next;
        });
      }
    },
    [issues]
  );

  // Bulk action state
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const handleClearSelection = useCallback(() => {
    setSelectedIssueKeys(new Set());
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (status: IssueStatus) => {
      if (selectedIssueKeys.size === 0) return;

      setIsBulkUpdating(true);
      try {
        const result = await bulkUpdateIssueStatus(
          Array.from(selectedIssueKeys),
          status
        );

        if (result.failed.length > 0) {
          showToast({
            type: "warning",
            title: "Partial update",
            message: `${result.updated} updated, ${result.failed.length} failed`,
          });
        } else {
          showToast({
            type: "success",
            title: "Bulk update complete",
            message: `${result.updated} issue(s) updated to "${status}"`,
          });
        }

        setSelectedIssueKeys(new Set());
        loadIssues();
      } catch (err) {
        showToast({
          type: "error",
          title: "Bulk update failed",
          message:
            err instanceof Error ? err.message : "Failed to update issues",
        });
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [selectedIssueKeys, loadIssues]
  );

  const handleBulkPriorityUpdate = useCallback(
    async (priority: IssuePriority) => {
      if (selectedIssueKeys.size === 0) return;

      setIsBulkUpdating(true);
      try {
        const result = await bulkUpdateIssuePriority(
          Array.from(selectedIssueKeys),
          priority
        );

        if (result.failed.length > 0) {
          showToast({
            type: "warning",
            title: "Partial update",
            message: `${result.updated} updated, ${result.failed.length} failed`,
          });
        } else {
          showToast({
            type: "success",
            title: "Bulk update complete",
            message: `${result.updated} issue(s) set to "${priority}" priority`,
          });
        }

        setSelectedIssueKeys(new Set());
        loadIssues();
      } catch (err) {
        showToast({
          type: "error",
          title: "Bulk update failed",
          message:
            err instanceof Error ? err.message : "Failed to update issues",
        });
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [selectedIssueKeys, loadIssues]
  );

  // Create Issue Modal state
  const [showFilters, setShowFilters] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation for issue list
  const { selectedIndex } = useListNavigation(issues, {
    onSelect: (issue: Issue) => handleIssueClick(issue.key),
  });

  // / - Focus search
  useKeyboardShortcut(
    "/",
    () => {
      searchInputRef.current?.focus();
    },
    { preventDefault: true }
  );

  // R - Refresh
  useKeyboardShortcut("r", handleRefresh);

  // F - Toggle filters
  useKeyboardShortcut("f", () => setShowFilters((prev) => !prev));

  // X - Select/deselect current issue (when navigating with keyboard)
  useKeyboardShortcut("x", () => {
    if (selectedIndex >= 0 && selectedIndex < issues.length && canBulkEdit) {
      handleToggleSelect(issues[selectedIndex].key);
    }
  });

  // Shift+X - Select all
  useKeyboardShortcut(
    "x",
    () => {
      if (canBulkEdit) {
        const allKeys = issues.map((i) => i.key);
        const allSelected = issues.every((i) => selectedIssueKeys.has(i.key));
        handleSelectAll(allSelected ? [] : allKeys);
      }
    },
    { shift: true }
  );

  // If an issue is selected, render the detail page with sequential navigation
  if (selectedIssueKey) {
    return (
      <IssueDetailPage
        issueKey={selectedIssueKey}
        onBack={handleBackToList}
        onPrevious={handlePreviousIssue}
        onNext={handleNextIssue}
        hasPrevious={hasPreviousIssue}
        hasNext={hasNextIssue}
      />
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Issues
            </h1>
            {lastUpdated && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-GB", {
                  timeZone: "Europe/London",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="Force refresh from Jira (bypasses cache)"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Syncing..." : "Refresh"}
            </button>

            {/* Create issue button */}
            <button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("open-create-modal"))
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-relay-gradient rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              title="Create new issue (C)"
            >
              <Plus className="w-4 h-4" />
              <span>New Issue</span>
              <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-xs font-mono bg-white/20 rounded">
                C
              </kbd>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search bar */}
          <SearchBar
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by summary or description..."
          />

          {/* Filter bar */}
          {showFilters && (
            <FilterBar
              selectedStatuses={selectedStatuses}
              selectedPriorities={selectedPriorities}
              selectedTypes={selectedTypes}
              selectedTools={selectedTools}
              filterModes={filterModes}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onTypeChange={handleTypeChange}
              onToolChange={handleToolChange}
              onFilterModeChange={handleFilterModeChange}
              onClearAll={handleClearAll}
            />
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Issue list */}
        <IssueList
          issues={filteredIssues}
          isLoading={isLoading}
          onIssueClick={handleIssueClick}
          selectable={canBulkEdit}
          selectedKeys={selectedIssueKeys}
          onToggle={handleToggleSelect}
          onSelectAll={handleSelectAll}
          hasFilters={
            selectedStatuses.length > 0 ||
            selectedPriorities.length > 0 ||
            selectedTypes.length > 0 ||
            selectedTools.length > 0 ||
            !!searchQuery
          }
          onClearFilters={handleClearAll}
          onCreateIssue={() =>
            window.dispatchEvent(new CustomEvent("open-create-modal"))
          }
        />

        {/* Pagination */}
        {!isLoading && !error && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      {canBulkEdit && (
        <BulkActionBar
          selectedCount={selectedIssueKeys.size}
          onClearSelection={handleClearSelection}
          onApplyStatus={handleBulkStatusUpdate}
          onApplyPriority={handleBulkPriorityUpdate}
          isLoading={isBulkUpdating}
        />
      )}
    </MainLayout>
  );
}
