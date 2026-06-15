import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Play,
  ClipboardList,
  ArrowLeft,
  Edit2,
  Check,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import api, { acknowledgeCommonIssue } from "../../services/api";
import type {
  Session,
  QuestionAnalysis,
  CommonIssue,
  SessionRatings,
  ActionItem,
} from "../../types";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { QuestionAnalyses } from "../analyses/QuestionAnalyses";
import { CommonIssuesTable } from "../analyses/CommonIssuesTable";
import { ActionItemForm } from "../actionItems/ActionItemForm";
import { useAuth } from "../../contexts/AuthContext";
import { ToastContainer, useToast } from "../common/Toast";
import { AnalysisProgress } from "./AnalysisProgress";
import { ExportButtons } from "../common/ExportButtons";
import { useAnalysisProgress } from "../../hooks/useAnalysisProgress";
import { BenchmarksCard } from "../reports/BenchmarksCard";

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError, showWarning } =
    useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [analyses, setAnalyses] = useState<QuestionAnalysis[]>([]);
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [ratings, setRatings] = useState<SessionRatings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [showActionItemForm, setShowActionItemForm] = useState(false);
  const [prefilledIssue, setPrefilledIssue] = useState<string>("");
  const [editingActionItem, setEditingActionItem] = useState<ActionItem | null>(null);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStreamingProgress, setShowStreamingProgress] = useState(false);

  // SSE-based analysis progress hook
  const {
    startAnalysis,
    cancelAnalysis,
    progress,
    isAnalyzing: isStreamingAnalysis,
    error: analysisError,
    isComplete: isAnalysisComplete,
    isCached,
  } = useAnalysisProgress(() => {
    // On completion, refresh data
    fetchSessionData();
    showSuccess(
      "Analysis Complete",
      isCached ? "Retrieved cached results." : "AI analysis has finished successfully."
    );
    // Hide progress after a short delay
    setTimeout(() => setShowStreamingProgress(false), 2000);
  });

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  // Fetch all session IDs for navigation (only once)
  useEffect(() => {
    const fetchSessionIds = async () => {
      try {
        const { data } = await api.get("/sessions");
        // Sessions are sorted by date desc from the API
        setSessionIds(data.map((s: Session) => s.id));
      } catch (error) {
        console.error("Failed to fetch session list for navigation", error);
      }
    };
    if (sessionIds.length === 0) {
      fetchSessionIds();
    }
  }, []);

  // Navigation helpers
  const currentIndex = sessionIds.indexOf(id || "");
  const prevSessionId = currentIndex > 0 ? sessionIds[currentIndex - 1] : null;
  const nextSessionId =
    currentIndex < sessionIds.length - 1 ? sessionIds[currentIndex + 1] : null;

  const goToPrevSession = () => {
    if (prevSessionId) navigate(`/sessions/${prevSessionId}`);
  };

  const goToNextSession = () => {
    if (nextSessionId) navigate(`/sessions/${nextSessionId}`);
  };

  const fetchSessionData = async () => {
    try {
      const [sessRes, analRes, issuesRes, rateRes, actionRes] =
        await Promise.all([
          api.get(`/sessions/${id}`),
          api.get(`/sessions/${id}/analyses`),
          api.get(`/sessions/${id}/common-issues`),
          api.get(`/sessions/${id}/ratings`),
          api.get(`/action-items?session_id=${id}`),
        ]);

      setSession(sessRes.data);
      setAnalyses(analRes.data);
      setCommonIssues(issuesRes.data);
      setRatings(rateRes.data);
      setActionItems(actionRes.data);
      setNewName(sessRes.data.session_name);
    } catch (error) {
      console.error("Error fetching session details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisClick = () => {
    setShowAnalysisModal(true);
  };

  const runAnalysis = async (force: boolean = false) => {
    setShowAnalysisModal(false);
    setShowStreamingProgress(true);

    // Use SSE streaming for real-time progress
    if (id) {
      startAnalysis(id, force);
    }
  };

  const handleRetryAnalysis = () => {
    if (id) {
      startAnalysis(id, true); // Force re-analysis on retry
    }
  };

  const handleCancelAnalysis = () => {
    cancelAnalysis();
    setShowStreamingProgress(false);
  };

  const saveSessionName = async () => {
    if (!newName.trim()) {
      showWarning("Invalid Name", "Session name cannot be empty.");
      return;
    }
    try {
      await api.patch(`/sessions/${id}`, { session_name: newName });
      setSession((prev) => (prev ? { ...prev, session_name: newName } : null));
      setEditingName(false);
      showSuccess("Name Updated", "Session name has been updated.");
    } catch (error: any) {
      showError("Update Failed", error.response?.data?.error || error.message);
    }
  };

  const cancelEdit = () => {
    setNewName(session?.session_name || "");
    setEditingName(false);
  };

  const handleCreateActionItem = (issue: CommonIssue) => {
    setPrefilledIssue(issue.common_issue);
    setEditingActionItem(null);
    setShowActionItemForm(true);
  };

  const handleEditActionItem = (actionItem: ActionItem) => {
    setEditingActionItem(actionItem);
    setPrefilledIssue("");
    setShowActionItemForm(true);
  };

  const handleActionItemSuccess = async () => {
    setShowActionItemForm(false);
    setPrefilledIssue("");
    setEditingActionItem(null);
    // Refresh action items to update the CommonIssuesTable
    try {
      const { data } = await api.get(`/action-items?session_id=${id}`);
      setActionItems(data);
    } catch (error) {
      console.error("Error refreshing action items", error);
    }
  };

  const handleDeleteActionItem = async (actionItem: ActionItem) => {
    if (!confirm(`Delete action item for "${actionItem.issue}"?`)) return;
    try {
      await api.delete(`/action-items/${actionItem.id}`);
      // Refresh action items
      const { data } = await api.get(`/action-items?session_id=${id}`);
      setActionItems(data);
      showSuccess("Deleted", "Action item has been deleted.");
    } catch (error: any) {
      console.error("Error deleting action item", error);
      showError("Delete Failed", error.response?.data?.error || error.message);
    }
  };

  const handleAcknowledge = async (issue: CommonIssue) => {
    try {
      await acknowledgeCommonIssue(issue.id);
      // Refresh common issues to reflect the updated status
      const { data } = await api.get(`/sessions/${id}/common-issues`);
      setCommonIssues(data);
      showSuccess("Issue Acknowledged", "The issue has been marked as acknowledged.");
    } catch (error: any) {
      console.error("Error acknowledging issue", error);
      showError("Acknowledge Failed", error.response?.data?.error || error.message);
    }
  };

  const handleDeleteSession = async () => {
    try {
      await api.delete(`/sessions/${id}`);
      showSuccess("Deleted", "Session has been deleted.");
      navigate("/sessions");
    } catch (error: any) {
      console.error("Error deleting session", error);
      showError("Delete Failed", error.response?.data?.error || error.message);
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!session) return <div>Session not found</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/sessions"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sessions
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevSession}
              disabled={!prevSessionId}
              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous session"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </button>
            <button
              onClick={goToNextSession}
              disabled={!nextSessionId}
              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next session"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-2xl font-bold border-b-2 border-primary bg-transparent focus:outline-none text-gray-900 dark:text-gray-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveSessionName();
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <button
                  onClick={saveSessionName}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-red-600 hover:text-red-700"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {session.session_name}
                </h1>
                {user?.role === "admin" && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Rename session"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ID: {session.session_id} • Session date:{" "}
              {new Date(session.session_date).toLocaleDateString()} •{" "}
              Facilitator: {session.facilitator_name} •{" "}
              {session.num_responses} responses
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <button
                onClick={handleAnalysisClick}
                disabled={isStreamingAnalysis}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
              >
                {isStreamingAnalysis ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isStreamingAnalysis
                  ? session.status === "analyzed"
                    ? "Re-analyzing..."
                    : "Analyzing..."
                  : session.status === "analyzed"
                  ? "Re-run AI Analysis"
                  : "Run AI Analysis"}
              </button>
            )}
            <Link
              to={`/action-items?session_id=${id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Action Items
            </Link>
            {/* Export Buttons */}
            {session.status === "analyzed" && (
              <ExportButtons
                sessionId={session.id}
                sessionCode={session.session_id}
                disabled={isStreamingAnalysis}
              />
            )}
            {user?.role === "admin" && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-700 text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Delete session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {/* Analysis metadata - shown below header when analyzed */}
        {session.status === "analyzed" && (
          <div className="flex items-center justify-end gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {session.analyzed_at && (
              <span>Last analyzed: {new Date(session.analyzed_at).toLocaleString()}</span>
            )}
            <span className="text-gray-400 dark:text-gray-500 max-w-[300px]">
              Tip: Re-run analysis if more responses have been imported.
            </span>
          </div>
        )}
      </div>

      {/* Analysis Progress (SSE) */}
      {showStreamingProgress && (
        <AnalysisProgress
          progress={progress}
          error={analysisError}
          isAnalyzing={isStreamingAnalysis}
          isComplete={isAnalysisComplete}
          isCached={isCached}
          onCancel={handleCancelAnalysis}
          onRetry={handleRetryAnalysis}
        />
      )}

      {/* Ratings Summary (Small Cards) - Traffic Light Colors */}
      {ratings && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <RatingCard label="Overall" value={ratings.overall_quality} />
          <RatingCard label="Repeatability" value={ratings.repeatability} />
          <RatingCard label="Facilitator" value={ratings.facilitator_understanding} />
          <RatingCard label="Content" value={ratings.learning_mechanics} />
        </div>
      )}

      {/* Session Benchmarks */}
      {ratings && id && (
        <BenchmarksCard sessionId={id} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Analyses (Tabs) */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Question Analysis
              </h2>
            </div>
            <QuestionAnalyses analyses={analyses} />
          </section>

          <section>
            <CommonIssuesTable
              issues={commonIssues}
              actionItems={actionItems}
              onCreateActionItem={handleCreateActionItem}
              onEditActionItem={handleEditActionItem}
              onDeleteActionItem={handleDeleteActionItem}
              onAcknowledge={handleAcknowledge}
            />
          </section>
        </div>

        {/* Right Column: Actions / Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Quick Stats
            </h3>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Pace
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {ratings?.session_pace || "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Tools Helpfulness
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {ratings?.tools_helpfulness || "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Q&A Support
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {ratings?.qa_support || "-"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Action Item Form Modal */}
      {showActionItemForm && (
        <ActionItemForm
          sessionId={id}
          initialData={
            editingActionItem
              ? editingActionItem
              : { issue: prefilledIssue, session_id: id }
          }
          onClose={() => {
            setShowActionItemForm(false);
            setPrefilledIssue("");
            setEditingActionItem(null);
          }}
          onSuccess={handleActionItemSuccess}
        />
      )}

      {/* Analysis Confirmation Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Run AI Analysis
              </h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-300">
                This will trigger AI analysis on all survey responses for this
                session. The process may take a minute or longer depending on
                the amount of data.
              </p>
              {session.status === "analyzed" && (
                <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
                  Note: This session has already been analyzed. Running again
                  will replace the existing analysis.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              {session.status === "analyzed" && (
                <button
                  onClick={() => runAnalysis(true)}
                  className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
                >
                  Force Re-analyze
                </button>
              )}
              <button
                onClick={() => runAnalysis()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                {session.status === "analyzed" ? "Use Cache" : "Run Analysis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Delete Session
              </h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <strong>{session.session_name}</strong>?
              </p>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                This will permanently delete the session and all its analyses, common issues, and action items.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

/**
 * Returns Tailwind CSS classes for rating card based on score value.
 * Traffic Light System:
 * - 8.0 - 10.0: Excellent (Emerald/Green)
 * - 6.5 - 7.9:  Good/Average (Amber/Orange)
 * - < 6.5:     Needs Action (Rose/Red)
 */
const getRatingColor = (value: number | undefined): string => {
  if (value === undefined || value === null) {
    return "bg-gray-200 dark:bg-gray-700"; // No data
  }
  if (value >= 8.0) {
    return "bg-emerald-600 dark:bg-emerald-600";
  }
  if (value >= 6.5) {
    return "bg-amber-500 dark:bg-amber-500";
  }
  return "bg-rose-600 dark:bg-rose-600";
};

const RatingCard: React.FC<{
  label: string;
  value: number;
}> = ({ label, value }) => (
  <div
    className={clsx(
      "p-4 rounded-lg shadow flex flex-col items-center justify-center text-center",
      getRatingColor(value)
    )}
  >
    <span className="text-2xl font-bold text-white">
      {value?.toFixed(1) || "-"}
    </span>
    <span className="text-xs mt-1 text-white/80">
      {label}
    </span>
  </div>
);
