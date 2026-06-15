import { createContext } from "react";

export type WorkspaceType = "jira" | "harry-botter";

export interface WorkspaceConfig {
  id: WorkspaceType;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  icon: string;
}

export const WORKSPACE_CONFIGS: Record<WorkspaceType, WorkspaceConfig> = {
  jira: {
    id: "jira",
    name: "Jira - Foodstyles.devs",
    description: "Bug tracking & issue management for the devs",
    primaryColor: "#FF6B35",
    secondaryColor: "#F7931E",
    icon: "radio",
  },
  "harry-botter": {
    id: "harry-botter",
    name: "Harry Botter",
    description: "Tech Tools Ticketing System",
    primaryColor: "#00D2FF",
    secondaryColor: "#3A7BD5",
    icon: "bot",
  },
};

export interface WorkspaceContextType {
  activeWorkspace: WorkspaceType;
  setActiveWorkspace: (workspace: WorkspaceType) => void;
  workspaceConfig: WorkspaceConfig;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);
