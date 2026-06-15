import { useState, useEffect, type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { CommandPalette } from "./CommandPalette";
import { CreateIssueModal } from "./issues";
import { HarryBotterView } from "./HarryBotterView";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { useWorkspace } from "../hooks/useWorkspace";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isStaging = import.meta.env.VITE_APP_ENV === "staging";
  const { activeWorkspace } = useWorkspace();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<
    "Bug" | "Task" | "Story" | undefined
  >(undefined);

  // Global Cmd+K / Ctrl+K toggle
  useKeyboardShortcut("k", () => setIsCommandPaletteOpen((prev) => !prev), {
    cmdOrCtrl: true,
  });

  const handleNavigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    setIsCommandPaletteOpen(false);
  };

  const handleOpenCreateModal = (type?: "Bug" | "Task" | "Story") => {
    setCreateModalType(type);
    setIsCreateModalOpen(true);
    setIsCommandPaletteOpen(false);
  };

  const handleIssueCreated = (issueKey: string) => {
    setIsCreateModalOpen(false);
    handleNavigate(`/issues/${issueKey}`);
  };

  // Listen for global trigger to open modal
  useEffect(() => {
    const handleOpen = (
      e: CustomEvent<{ type?: "Bug" | "Task" | "Story" }>
    ) => {
      handleOpenCreateModal(e.detail?.type);
    };
    window.addEventListener("open-create-modal" as any, handleOpen);
    return () =>
      window.removeEventListener("open-create-modal" as any, handleOpen);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {isStaging && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 uppercase tracking-widest">
          Staging Environment - Data may be wiped
        </div>
      )}
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Conditional content based on workspace */}
          {activeWorkspace === "harry-botter" ? (
            <HarryBotterView />
          ) : (
            children
          )}
        </div>
      </main>
      {/* Footer - only show for Jira workspace */}
      {activeWorkspace === "jira" && (
        <footer className="border-t border-gray-200 dark:border-gray-800 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Relay - Fast track from report to resolution
            </p>
          </div>
        </footer>
      )}

      {/* Global Components - only for Jira workspace */}
      {activeWorkspace === "jira" && (
        <>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onNavigate={handleNavigate}
            onOpenCreateModal={handleOpenCreateModal}
          />

          {isCreateModalOpen && (
            <CreateIssueModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSuccess={handleIssueCreated}
              initialType={createModalType}
            />
          )}
        </>
      )}
    </div>
  );
}
