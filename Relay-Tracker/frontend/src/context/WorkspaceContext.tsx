import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  WorkspaceContext,
  WORKSPACE_CONFIGS,
  type WorkspaceType,
  type WorkspaceContextType,
} from "./workspace-context";

// Re-export types for convenience
export type { WorkspaceType, WorkspaceConfig, WorkspaceContextType } from "./workspace-context";
export { WorkspaceContext, WORKSPACE_CONFIGS } from "./workspace-context";

const WORKSPACE_STORAGE_KEY = "relay_active_workspace";

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceType>(() => {
    // Initialize from localStorage or default to 'jira'
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored === "jira" || stored === "harry-botter") {
      return stored;
    }
    return "jira";
  });

  const setActiveWorkspace = useCallback((workspace: WorkspaceType) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace);
  }, []);

  const workspaceConfig = WORKSPACE_CONFIGS[activeWorkspace];

  // Apply workspace theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const config = WORKSPACE_CONFIGS[activeWorkspace];

    // Set CSS custom properties for dynamic theming
    root.style.setProperty("--workspace-primary", config.primaryColor);
    root.style.setProperty("--workspace-secondary", config.secondaryColor);

    // Toggle workspace class for conditional styling
    root.classList.remove("workspace-jira", "workspace-harry-botter");
    root.classList.add(`workspace-${activeWorkspace}`);
  }, [activeWorkspace]);

  const value: WorkspaceContextType = {
    activeWorkspace,
    setActiveWorkspace,
    workspaceConfig,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
