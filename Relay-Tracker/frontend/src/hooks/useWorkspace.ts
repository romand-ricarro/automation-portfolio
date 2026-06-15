import { useContext } from "react";
import { WorkspaceContext, type WorkspaceContextType } from "../context/workspace-context";

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);

  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
