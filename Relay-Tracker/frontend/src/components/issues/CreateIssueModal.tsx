import { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Bug,
  ListTodo,
  BookOpen,
  Loader2,
  AlertCircle,
  Check,
  Info,
  CheckCircle,
  Link2,
} from "lucide-react";
import type { IssueType, IssuePriority } from "../../types";
import { createIssue, type CreateIssueData } from "../../lib/api";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { createValidationError } from "../../lib/errors";
import { FileDropzone } from "../ui/FileDropzone";
import { uploadFiles } from "../../lib/upload";
import { useAuth } from "../../hooks/useAuth";

const DRAFT_KEY = "relay_issue_draft";

interface DraftData {
  summary: string;
  priority: IssuePriority;
  type: IssueType | null;
  // Bug fields
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  loomLink?: string;
  // Story fields
  problemDescription?: string;
  proposedSolution?: string;
  acceptanceCriteria?: string;
  scope?: string;
  // Task fields
  taskDescription?: string;
  notes?: string;
  links?: string;
}

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (issueKey: string) => void;
  initialType?: IssueType;
}

interface FormErrors {
  summary?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  loomLink?: string;
  type?: string;
  priority?: string;
  problemDescription?: string;
  acceptanceCriteria?: string;
  taskDescription?: string;
}

const TYPE_OPTIONS: {
  value: IssueType;
  label: string;
  icon: typeof Bug;
  color: string;
  bgColor: string;
}[] = [
  {
    value: "Bug",
    label: "Bug",
    icon: Bug,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  {
    value: "Task",
    label: "Task",
    icon: ListTodo,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    value: "Story",
    label: "Story",
    icon: BookOpen,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
];

const PRIORITY_OPTIONS: {
  value: IssuePriority;
  label: string;
  color: string;
}[] = [
  {
    value: "Highest",
    label: "Highest",
    color: "text-red-600 dark:text-red-400",
  },
  {
    value: "High",
    label: "High",
    color: "text-orange-500 dark:text-orange-400",
  },
  {
    value: "Medium",
    label: "Medium",
    color: "text-yellow-500 dark:text-yellow-400",
  },
  { value: "Low", label: "Low", color: "text-gray-500 dark:text-gray-400" },
  {
    value: "Lowest",
    label: "Lowest",
    color: "text-slate-400 dark:text-slate-500",
  },
];

export function CreateIssueModal({
  isOpen,
  onClose,
  onSuccess,
  initialType,
}: CreateIssueModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<IssueType | null>(null);
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("Medium");

  // Bug fields
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [loomLink, setLoomLink] = useState("");

  // Story fields
  const [problemDescription, setProblemDescription] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [scope, setScope] = useState("");

  // Task fields
  const [taskDescription, setTaskDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // File upload state
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { idToken } = useAuth();
  const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Handle paste event to capture clipboard images
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!isOpen || step !== 2) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            // Generate a filename based on timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const extension = item.type.split("/")[1] || "png";
            const renamedFile = new File(
              [file],
              `pasted-image-${timestamp}.${extension}`,
              { type: file.type },
            );
            imageFiles.push(renamedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        setFiles((prev) => [...prev, ...imageFiles]);
      }
    },
    [isOpen, step],
  );

  // Attach paste listener to window when modal is open
  useEffect(() => {
    if (isOpen && step === 2) {
      window.addEventListener("paste", handlePaste);
      return () => window.removeEventListener("paste", handlePaste);
    }
  }, [isOpen, step, handlePaste]);

  // Load draft from localStorage when modal opens
  useEffect(() => {
    if (isOpen && !draftLoaded) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft: DraftData = JSON.parse(saved);
          setSummary(draft.summary || "");
          setPriority(draft.priority || "Medium");
          // Bug fields
          setStepsToReproduce(draft.stepsToReproduce || "");
          setExpectedResult(draft.expectedResult || "");
          setActualResult(draft.actualResult || "");
          setLoomLink(draft.loomLink || "");
          // Story fields
          setProblemDescription(draft.problemDescription || "");
          setProposedSolution(draft.proposedSolution || "");
          setAcceptanceCriteria(draft.acceptanceCriteria || "");
          setScope(draft.scope || "");
          // Task fields
          setTaskDescription(draft.taskDescription || "");
          setNotes(draft.notes || "");
          setLinks(draft.links || "");

          if (initialType) {
            setType(initialType);
            setStep(2);
          } else if (draft.type) {
            setType(draft.type);
            // Don't auto-jump to step 2 if no initialType was provided
            setStep(1);
          }
        } else if (initialType) {
          setType(initialType);
          setStep(2);
        }
      } catch {
        // Invalid draft, ignore
      }
      setDraftLoaded(true);
    }
  }, [isOpen, draftLoaded, initialType]);

  // Save draft to localStorage (debounced 500ms)
  const saveDraft = useCallback(() => {
    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current);
    }
    saveDraftTimeoutRef.current = setTimeout(() => {
      const draft: DraftData = {
        summary,
        priority,
        type,
        stepsToReproduce,
        expectedResult,
        actualResult,
        loomLink,
        problemDescription,
        proposedSolution,
        acceptanceCriteria,
        scope,
        taskDescription,
        notes,
        links,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 500);
  }, [
    summary,
    priority,
    type,
    stepsToReproduce,
    expectedResult,
    actualResult,
    loomLink,
    problemDescription,
    proposedSolution,
    acceptanceCriteria,
    scope,
    taskDescription,
    notes,
    links,
  ]);

  // Trigger save on field changes
  useEffect(() => {
    if (draftLoaded && isOpen) {
      saveDraft();
    }
  }, [
    summary,
    priority,
    type,
    stepsToReproduce,
    expectedResult,
    actualResult,
    loomLink,
    problemDescription,
    proposedSolution,
    acceptanceCriteria,
    scope,
    taskDescription,
    notes,
    links,
    draftLoaded,
    isOpen,
    saveDraft,
  ]);

  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const validateField = useCallback(
    (field: string, value: string) => {
      const newErrors: FormErrors = { ...errors };

      switch (field) {
        case "summary":
          if (!value.trim()) {
            newErrors.summary = createValidationError(
              "summary",
              "required",
            ).message;
          } else if (value.length < 5) {
            newErrors.summary = createValidationError("summary", "minLength", {
              min: 5,
              current: value.length,
            }).message;
          } else if (value.length > 255) {
            newErrors.summary = createValidationError("summary", "maxLength", {
              max: 255,
              current: value.length,
            }).message;
          } else {
            delete newErrors.summary;
          }
          break;
        case "stepsToReproduce":
          if (type === "Bug") {
            if (!value.trim()) {
              newErrors.stepsToReproduce = "Steps to reproduce are required";
            } else {
              delete newErrors.stepsToReproduce;
            }
          }
          break;
        case "expectedResult":
          if (type === "Bug") {
            if (!value.trim()) {
              newErrors.expectedResult = "Expected result is required";
            } else {
              delete newErrors.expectedResult;
            }
          }
          break;
        case "actualResult":
          if (type === "Bug") {
            if (!value.trim()) {
              newErrors.actualResult = "Actual result is required";
            } else {
              delete newErrors.actualResult;
            }
          }
          break;
        case "loomLink":
          if (type === "Bug") {
            if (!value.trim()) {
              newErrors.loomLink = "A video or screenshot link is required";
            } else if (!value.startsWith("http")) {
              newErrors.loomLink = "Please enter a valid URL";
            } else {
              delete newErrors.loomLink;
            }
          } else {
            // Optional for Task and Story - only validate if provided
            if (value.trim() && !value.startsWith("http")) {
              newErrors.loomLink = "Please enter a valid URL";
            } else {
              delete newErrors.loomLink;
            }
          }
          break;
        case "problemDescription":
          if (type === "Story") {
            if (!value.trim()) {
              newErrors.problemDescription = "Problem description is required";
            } else {
              delete newErrors.problemDescription;
            }
          }
          break;
        case "acceptanceCriteria":
          if (type === "Story") {
            if (!value.trim()) {
              newErrors.acceptanceCriteria = "Acceptance criteria is required";
            } else {
              delete newErrors.acceptanceCriteria;
            }
          }
          break;
        case "taskDescription":
          if (type === "Task") {
            if (!value.trim()) {
              newErrors.taskDescription = "Task description is required";
            } else {
              delete newErrors.taskDescription;
            }
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [errors, type],
  );

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const handleTypeSelect = (selectedType: IssueType) => {
    setType(selectedType);
    setStep(2);
    // Clear errors when switching type
    setErrors({});
    setTouched({});
  };

  const handleBack = () => {
    setStep(1);
  };

  const isFormValid = () => {
    if (
      !type ||
      !summary.trim() ||
      summary.length > 255 ||
      summary.length < 5
    ) {
      return false;
    }

    switch (type) {
      case "Bug":
        // Media link is mandatory for Bug reports only
        if (!loomLink.trim() || !loomLink.startsWith("http")) {
          return false;
        }
        return (
          stepsToReproduce.trim().length > 0 &&
          expectedResult.trim().length > 0 &&
          actualResult.trim().length > 0
        );
      case "Story":
        // Media link is optional for Stories - validate format if provided
        if (loomLink.trim() && !loomLink.startsWith("http")) {
          return false;
        }
        return (
          problemDescription.trim().length > 0 &&
          acceptanceCriteria.trim().length > 0
        );
      case "Task":
        // Media link is optional for Tasks - validate format if provided
        if (loomLink.trim() && !loomLink.startsWith("http")) {
          return false;
        }
        return taskDescription.trim().length > 0;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    // Validate all fields based on type
    validateField("summary", summary);
    setTouched({ summary: true });

    if (type === "Bug") {
      validateField("stepsToReproduce", stepsToReproduce);
      validateField("expectedResult", expectedResult);
      validateField("actualResult", actualResult);
      validateField("loomLink", loomLink);
      setTouched((prev) => ({
        ...prev,
        stepsToReproduce: true,
        expectedResult: true,
        actualResult: true,
        loomLink: true,
      }));
    } else if (type === "Story") {
      validateField("problemDescription", problemDescription);
      validateField("acceptanceCriteria", acceptanceCriteria);
      // loomLink is optional for Story, only validate if provided
      if (loomLink.trim()) {
        validateField("loomLink", loomLink);
      }
      setTouched((prev) => ({
        ...prev,
        problemDescription: true,
        acceptanceCriteria: true,
        loomLink: true,
      }));
    } else if (type === "Task") {
      validateField("taskDescription", taskDescription);
      // loomLink is optional for Task, only validate if provided
      if (loomLink.trim()) {
        validateField("loomLink", loomLink);
      }
      setTouched((prev) => ({ ...prev, taskDescription: true, loomLink: true }));
    }

    if (!isFormValid() || !type) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Upload files to R2 if any
      let uploadResults: any[] = [];

      if (files.length > 0) {
        setIsUploading(true);
        try {
          uploadResults = await uploadFiles(
            files,
            idToken || "",
            (_idx, progress) => {
              setUploadProgress(progress);
            },
          );
        } catch (err) {
          throw new Error(
            `File upload failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        } finally {
          setIsUploading(false);
        }
      }

      // 2. Prepare issue data (include R2 links in description via SOP)
      // Format links using Jira wiki syntax: [filename|url] for cleaner display
      const r2LinksText =
        uploadResults.length > 0
          ? `\n\n*Relay Attachments:*\n${uploadResults
              .map((r) => `[${r.filename}|${r.url}]`)
              .join("\n")}`
          : "";

      let issueData: CreateIssueData;

      switch (type) {
        case "Bug":
          issueData = {
            type: "Bug",
            summary: summary.trim(),
            details: `Steps To Reproduce:\n${stepsToReproduce}\n\nExpected Result:\n${expectedResult}\n\nActual Result:\n${actualResult}${r2LinksText}`,
            stepsToReproduce: stepsToReproduce.trim(),
            expectedResult: expectedResult.trim(),
            actualResult: actualResult.trim(),
            priority,
            attachmentLinks: loomLink.trim(),
          };
          break;
        case "Story":
          issueData = {
            type: "Story",
            summary: summary.trim(),
            priority,
            problemDescription: problemDescription.trim() + r2LinksText,
            proposedSolution: proposedSolution.trim() || undefined,
            acceptanceCriteria: acceptanceCriteria.trim(),
            scope: scope.trim() || undefined,
            attachmentLinks: loomLink.trim() || undefined,
          };
          break;
        case "Task":
          issueData = {
            type: "Task",
            summary: summary.trim(),
            priority,
            taskDescription: taskDescription.trim() + r2LinksText,
            notes: notes.trim() || undefined,
            links: links.trim() || undefined,
            attachmentLinks: loomLink.trim() || undefined,
          };
          break;
      }

      const result = await createIssue(issueData);
      const issueKey = result.key;

      // 3. Register attachments in the local database
      const API_URL = import.meta.env.VITE_API_URL ?? "";
      if (uploadResults.length > 0) {
        for (const res of uploadResults) {
          try {
            await fetch(`${API_URL}/api/issues/${issueKey}/attachments`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                id: res.key, // Use the R2 key as the unique ID
                url: res.url,
                filename: res.filename,
                size: res.size,
                mime_type: res.mime_type,
              }),
            });
          } catch (err) {
            console.error(
              `Failed to register attachment ${res.filename}:`,
              err,
            );
            // We don't fail the whole issue creation if one registration fails
          }
        }
      }

      // Success! Clear the draft
      clearDraft();
      onSuccess(result.key);
      resetForm();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create issue",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setType(null);
    setSummary("");
    setPriority("Medium");
    setStepsToReproduce("");
    setExpectedResult("");
    setActualResult("");
    setLoomLink("");
    setProblemDescription("");
    setProposedSolution("");
    setAcceptanceCriteria("");
    setScope("");
    setTaskDescription("");
    setNotes("");
    setLinks("");
    setErrors({});
    setTouched({});
    setSubmitError(null);
    setDraftLoaded(false);
    // Reset file state
    setFiles([]);
    setUploadProgress(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Keyboard shortcuts
  useKeyboardShortcut("Escape", handleClose, { enableInInput: true });

  // Cmd/Ctrl + Enter to submit (only when modal is open and on step 2)
  useKeyboardShortcut(
    "Enter",
    () => {
      if (isOpen && step === 2 && isFormValid() && !isSubmitting) {
        handleSubmit();
      }
    },
    { cmdOrCtrl: true, enableInInput: true },
  );

  if (!isOpen) return null;

  // Render type-specific form fields
  const renderTypeFields = () => {
    switch (type) {
      case "Bug":
        return (
          <>
            {/* Steps To Reproduce */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Steps To Reproduce <span className="text-red-500">*</span>
              </label>
              <textarea
                value={stepsToReproduce}
                onChange={(e) => {
                  setStepsToReproduce(e.target.value);
                  if (touched.stepsToReproduce)
                    validateField("stepsToReproduce", e.target.value);
                }}
                onBlur={() => handleBlur("stepsToReproduce", stepsToReproduce)}
                placeholder={`1. Go to...
2. Click on...
3. See the error...`}
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.stepsToReproduce && touched.stepsToReproduce
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors resize-none`}
              />
              {errors.stepsToReproduce && touched.stepsToReproduce && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.stepsToReproduce}
                </p>
              )}
            </div>

            {/* Expected Result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Result <span className="text-red-500">*</span>
              </label>
              <textarea
                value={expectedResult}
                onChange={(e) => {
                  setExpectedResult(e.target.value);
                  if (touched.expectedResult)
                    validateField("expectedResult", e.target.value);
                }}
                onBlur={() => handleBlur("expectedResult", expectedResult)}
                placeholder="What should have happened?"
                rows={2}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.expectedResult && touched.expectedResult
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors resize-none`}
              />
              {errors.expectedResult && touched.expectedResult && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.expectedResult}
                </p>
              )}
            </div>

            {/* Actual Result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actual Result <span className="text-red-500">*</span>
              </label>
              <textarea
                value={actualResult}
                onChange={(e) => {
                  setActualResult(e.target.value);
                  if (touched.actualResult)
                    validateField("actualResult", e.target.value);
                }}
                onBlur={() => handleBlur("actualResult", actualResult)}
                placeholder="What actually happened?"
                rows={2}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.actualResult && touched.actualResult
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors resize-none`}
              />
              {errors.actualResult && touched.actualResult && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.actualResult}
                </p>
              )}
            </div>

            {/* BEB Recording Info Alert */}
            <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">
                  Recording Performance Issues?
                </p>
                <p>
                  If you are reporting a slowdown, please keep your BEB
                  recording running, run a Speedtest, and then stop the
                  recording.
                </p>
              </div>
            </div>

            {/* Video/Screenshot Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video or Screenshot Link <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Add a Loom, Google Drive, or other link to your
                recording/screenshot (Required)
              </p>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={loomLink}
                  onChange={(e) => {
                    setLoomLink(e.target.value);
                    if (touched.loomLink)
                      validateField("loomLink", e.target.value);
                  }}
                  onBlur={() => handleBlur("loomLink", loomLink)}
                  placeholder="https://www.loom.com/share/..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.loomLink && touched.loomLink
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors`}
                />
              </div>
              {errors.loomLink && touched.loomLink && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.loomLink}
                </p>
              )}
            </div>
          </>
        );

      case "Story":
        return (
          <>
            {/* Problem Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Problem Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={problemDescription}
                onChange={(e) => {
                  setProblemDescription(e.target.value);
                  if (touched.problemDescription)
                    validateField("problemDescription", e.target.value);
                }}
                onBlur={() =>
                  handleBlur("problemDescription", problemDescription)
                }
                placeholder="What problem does this feature solve? Why is it needed?"
                rows={3}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.problemDescription && touched.problemDescription
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors resize-none`}
              />
              {errors.problemDescription && touched.problemDescription && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.problemDescription}
                </p>
              )}
            </div>

            {/* Proposed Solution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proposed Solution
              </label>
              <textarea
                value={proposedSolution}
                onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="How should this problem be solved? (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-relay-orange transition-colors resize-none"
              />
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Acceptance Criteria <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                How will we know when this feature is complete?
              </p>
              <textarea
                value={acceptanceCriteria}
                onChange={(e) => {
                  setAcceptanceCriteria(e.target.value);
                  if (touched.acceptanceCriteria)
                    validateField("acceptanceCriteria", e.target.value);
                }}
                onBlur={() =>
                  handleBlur("acceptanceCriteria", acceptanceCriteria)
                }
                placeholder={`- Users can...
- The system should...
- When X happens, Y should...`}
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.acceptanceCriteria && touched.acceptanceCriteria
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors resize-none`}
              />
              {errors.acceptanceCriteria && touched.acceptanceCriteria && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.acceptanceCriteria}
                </p>
              )}
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scope
              </label>
              <textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="What is in and out of scope for this feature? (optional)"
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-relay-orange transition-colors resize-none"
              />
            </div>

            {/* Video/Screenshot Link (Optional for Story) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video or Screenshot Link
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Add a Loom, Google Drive, or other link to your
                recording/screenshot (Optional)
              </p>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={loomLink}
                  onChange={(e) => {
                    setLoomLink(e.target.value);
                    if (touched.loomLink)
                      validateField("loomLink", e.target.value);
                  }}
                  onBlur={() => handleBlur("loomLink", loomLink)}
                  placeholder="https://www.loom.com/share/..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.loomLink && touched.loomLink
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors`}
                />
              </div>
              {errors.loomLink && touched.loomLink && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.loomLink}
                </p>
              )}
            </div>
          </>
        );

      case "Task":
        return (
          <>
            {/* Task Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => {
                  setTaskDescription(e.target.value);
                  if (touched.taskDescription)
                    validateField("taskDescription", e.target.value);
                }}
                onBlur={() => handleBlur("taskDescription", taskDescription)}
                placeholder="Describe what needs to be done in detail..."
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.taskDescription && touched.taskDescription
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors resize-none`}
              />
              {errors.taskDescription && touched.taskDescription && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.taskDescription}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or context... (optional)"
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-relay-orange transition-colors resize-none"
              />
            </div>

            {/* Links / Templates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Links / Templates
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="Relevant links or template URLs... (optional)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-relay-orange transition-colors"
                />
              </div>
            </div>

            {/* Video/Screenshot Link (Optional for Task) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video or Screenshot Link
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Add a Loom, Google Drive, or other link to your
                recording/screenshot (Optional)
              </p>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={loomLink}
                  onChange={(e) => {
                    setLoomLink(e.target.value);
                    if (touched.loomLink)
                      validateField("loomLink", e.target.value);
                  }}
                  onBlur={() => handleBlur("loomLink", loomLink)}
                  placeholder="https://www.loom.com/share/..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.loomLink && touched.loomLink
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors`}
                />
              </div>
              {errors.loomLink && touched.loomLink && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.loomLink}
                </p>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {step === 1 ? "Create New Issue" : `New ${type}`}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            // Step 1: Type Selection
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                What type of issue are you reporting?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleTypeSelect(option.value)}
                      className="group p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-relay-orange dark:hover:border-relay-orange transition-all text-left"
                    >
                      <div
                        className={`w-14 h-14 rounded-xl ${option.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className={`w-7 h-7 ${option.color}`} />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {option.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {option.value === "Bug" && "Report a problem or error"}
                        {option.value === "Task" && "Request work to be done"}
                        {option.value === "Story" && "Describe a new feature"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Step 2: Issue Details (type-specific)
            <div className="space-y-6">
              {/* Summary (common to all types) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => {
                      setSummary(e.target.value);
                      if (touched.summary)
                        validateField("summary", e.target.value);
                    }}
                    onBlur={() => handleBlur("summary", summary)}
                    placeholder="Summarize the issue briefly"
                    maxLength={255}
                    className={`w-full px-4 py-3 pr-10 rounded-lg border ${
                      errors.summary && touched.summary
                        ? "border-red-500 focus:ring-red-500"
                        : touched.summary &&
                            !errors.summary &&
                            summary.trim().length >= 5
                          ? "border-green-500 focus:ring-green-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-relay-orange"
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors`}
                  />
                  {touched.summary &&
                    !errors.summary &&
                    summary.trim().length >= 5 && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                </div>
                <div className="flex justify-between mt-1">
                  {errors.summary && touched.summary ? (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.summary}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-sm ${
                      summary.length > 255 ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {summary.length}/255
                  </span>
                </div>
              </div>

              {/* Priority (common to all types) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Select according to Issue Reporting SOP
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        priority === option.value
                          ? "border-relay-orange bg-relay-orange/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <span className={option.color}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type-specific fields */}
              {renderTypeFields()}

              {/* File Upload (Common to all types) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments
                </label>
                <FileDropzone
                  files={files}
                  onFilesSelected={(newFiles) =>
                    setFiles((prev) => [...prev, ...newFiles])
                  }
                  onFileRemove={(index) =>
                    setFiles((prev) => prev.filter((_, i) => i !== index))
                  }
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  maxFiles={5}
                  maxSizeMB={10}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {submitError}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {step === 2 ? (
            <>
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 hidden sm:block">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                    {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+↵
                  </kbd>
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-relay-gradient text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Issue
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full text-center text-sm text-gray-500 dark:text-gray-400">
              Select an issue type to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
