import { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  MainLayout,
  ErrorBoundary,
  ProtectedRoute,
  ToastContainer,
  useToasts,
} from "./components";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { useAuth } from "./hooks/useAuth";
import { useWorkspace } from "./hooks/useWorkspace";
import { IssuesPage } from "./pages/Issues";
import { ProfilePage } from "./pages/Profile";
import { AdminSettingsPage } from "./pages/AdminSettings";
import { WhitelistManagementPage } from "./pages/WhitelistManagement";
import { DashboardIssueList } from "./components/issues";
import { Radio, Bug, ListTodo, BookOpen, XCircle } from "lucide-react";
import { checkHealth } from "./lib/api";

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

console.log("🏛️ Relay Auth Debug:", {
  origin: window.location.origin,
  clientId: GOOGLE_CLIENT_ID,
  backendUrl: import.meta.env.VITE_API_URL || window.location.origin,
  hasClientId: !!GOOGLE_CLIENT_ID,
  nodeEnv: import.meta.env.MODE,
});

// Simple hash-based routing
function useRoute() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  return { route, navigate };
}

function Dashboard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [dashboardFilter, setDashboardFilter] = useState<"all" | "my">("my");
  const [healthStatus, setHealthStatus] = useState<
    "healthy" | "unhealthy" | "loading"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check backend health on mount
  useEffect(() => {
    async function checkBackendHealth() {
      try {
        await checkHealth();
        setHealthStatus("healthy");
        setErrorMessage(null);
      } catch (err) {
        setHealthStatus("unhealthy");
        setErrorMessage(
          err instanceof Error ? err.message : "Backend unavailable"
        );
      }
    }
    checkBackendHealth();
  }, []);

  const handleOpenCreateModal = (type?: "Bug" | "Task" | "Story") => {
    window.dispatchEvent(
      new CustomEvent("open-create-modal", { detail: { type } })
    );
  };

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg ${
              activeWorkspace === 'jira' ? 'bg-relay-gradient' : 'bg-botter-gradient'
            }`}>
              <Radio className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Welcome back,{" "}
            <span className={activeWorkspace === 'jira' ? 'text-relay-gradient' : 'text-botter-gradient'}>
              {user?.name?.split(" ")[0] || "User"}
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Fast track from report to resolution
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          <button
            onClick={() => handleOpenCreateModal("Bug")}
            className="group p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 group-hover:bg-relay-gradient transition-colors">
              <Bug className="w-6 h-6 text-red-600 dark:text-red-400 group-hover:text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Report Bug
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found an issue? Let us know
            </p>
          </button>

          <button
            onClick={() => handleOpenCreateModal("Task")}
            className="group p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-relay-gradient transition-colors">
              <ListTodo className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Create Task
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Request a new feature or task
            </p>
          </button>

          <button
            onClick={() => handleOpenCreateModal("Story")}
            className="group p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:bg-relay-gradient transition-colors">
              <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Create Story
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Describe a new feature
            </p>
          </button>
        </div>

        {/* Recent Issues Widget */}
        <div className="mt-12 w-full max-w-3xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg w-fit">
                <button
                  onClick={() => setDashboardFilter("my")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    dashboardFilter === "my"
                      ? "bg-white dark:bg-gray-800 text-relay-orange shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  My Reports
                </button>
                <button
                  onClick={() => setDashboardFilter("all")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    dashboardFilter === "all"
                      ? "bg-white dark:bg-gray-800 text-relay-orange shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Recent Issues
                </button>
              </div>
              <button
                onClick={() => onNavigate("/issues")}
                className="text-xs font-medium text-relay-orange hover:underline px-2"
              >
                View all in issues tab →
              </button>
            </div>
            <DashboardIssueList
              onIssueClick={(key) => onNavigate(`/issues/${key}`)}
              relayReporterEmail={
                dashboardFilter === "my" ? user?.email : undefined
              }
            />
          </div>
        </div>

        {/* Conditional System Status - only show if unhealthy */}
        {healthStatus === "unhealthy" && (
          <div className="mt-6 w-full max-w-3xl">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-300">
                    System Status: Degraded
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errorMessage || "Some features may be unavailable"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function AppRouter() {
  const { route, navigate } = useRoute();

  // Match issue detail route OR issues list route - both handled by IssuesPage
  // IssuesPage handles sequential navigation internally
  if (
    route === "/issues" ||
    route.startsWith("/issues?") ||
    route.match(/^\/issues\/[A-Z]+-\d+$/)
  ) {
    return <IssuesPage />;
  }

  // Match profile route
  if (route === "/profile") {
    return <ProfilePage />;
  }

  // Match admin route
  if (route === "/admin") {
    return <AdminSettingsPage />;
  }

  // Match whitelist management route
  if (route === "/admin/whitelist") {
    return <WhitelistManagementPage />;
  }

  return <Dashboard onNavigate={navigate} />;
}

function ToastWrapper() {
  const { toasts, remove } = useToasts();
  return <ToastContainer toasts={toasts} onRemove={remove} />;
}

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <WorkspaceProvider>
            <ProtectedRoute>
              <AppRouter />
            </ProtectedRoute>
            <ToastWrapper />
          </WorkspaceProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
