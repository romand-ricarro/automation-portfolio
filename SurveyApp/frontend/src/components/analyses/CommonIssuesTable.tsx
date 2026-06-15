import React from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Clock, Check } from 'lucide-react';
import type { CommonIssue, ActionItem } from '../../types';

// Strip markdown bold/italic markers from AI-generated text
const stripMarkdown = (text: string) => text.replace(/\*{1,2}(.*?)\*{1,2}/g, '$1');

interface CommonIssuesTableProps {
    issues: CommonIssue[];
    actionItems?: ActionItem[];
    onCreateActionItem?: (issue: CommonIssue) => void;
    onEditActionItem?: (actionItem: ActionItem) => void;
    onDeleteActionItem?: (actionItem: ActionItem) => void;
    onAcknowledge?: (issue: CommonIssue) => void;
}

export const CommonIssuesTable: React.FC<CommonIssuesTableProps> = ({
    issues,
    actionItems = [],
    onCreateActionItem,
    onEditActionItem,
    onDeleteActionItem,
    onAcknowledge
}) => {
    if (issues.length === 0) return <div className="text-gray-500 italic p-4">No common issues identified yet.</div>;

    // Create a map of issue text to action items for quick lookup
    const issueToActionMap = new Map<string, ActionItem>();
    actionItems.forEach(action => {
        // Match action items to issues by comparing issue text
        issueToActionMap.set(action.issue, action);
    });

    const getActionForIssue = (issue: CommonIssue): ActionItem | undefined => {
        return issueToActionMap.get(issue.common_issue);
    };

    // Sort: acknowledged issues without action items sink to bottom
    const sortedIssues = [...issues].sort((a, b) => {
        const aAction = getActionForIssue(a);
        const bAction = getActionForIssue(b);
        const aAck = a.status === 'acknowledged' && !aAction;
        const bAck = b.status === 'acknowledged' && !bAction;

        // Acknowledged without action → bottom
        if (aAck !== bAck) return aAck ? 1 : -1;

        // Preserve original display_order within groups
        return a.display_order - b.display_order;
    });

    return (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Common Issues & Weak Signals
                </h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-900">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/4">
                            Common Issue
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/4">
                            Evidence / Signal
                        </th>
                        {(onCreateActionItem || onAcknowledge) && (
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Action
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedIssues.map((issue) => {
                        const existingAction = getActionForIssue(issue);
                        const isAcknowledged = issue.status === 'acknowledged';

                        return (
                            <tr
                                key={issue.id}
                                className={`hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                    isAcknowledged ? 'opacity-60' : ''
                                }`}
                            >
                                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {stripMarkdown(issue.common_issue)}
                                </td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-300 italic">
                                    {stripMarkdown(issue.evidence_signal)}
                                </td>
                                {(onCreateActionItem || onAcknowledge) && (
                                    <td className="px-6 py-4 text-sm">
                                        {existingAction ? (
                                            // Has an action item
                                            <div className="space-y-2">
                                                <p className="text-gray-700 dark:text-gray-200">
                                                    {existingAction.action}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        existingAction.status === 'Completed'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : existingAction.status === 'In Progress'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    }`}>
                                                        {existingAction.status === 'Completed' ? (
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                        ) : (
                                                            <Clock className="w-3 h-3 mr-1" />
                                                        )}
                                                        {existingAction.status}
                                                    </span>
                                                    {onEditActionItem && (
                                                        <button
                                                            onClick={() => onEditActionItem(existingAction)}
                                                            className="inline-flex items-center text-xs text-primary hover:text-primary-dark"
                                                        >
                                                            <Edit2 className="w-3 h-3 mr-1" />
                                                            Edit
                                                        </button>
                                                    )}
                                                    {onDeleteActionItem && (
                                                        <button
                                                            onClick={() => onDeleteActionItem(existingAction)}
                                                            className="inline-flex items-center text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Allow acknowledging even when action item exists */}
                                                {onAcknowledge && !isAcknowledged && (
                                                    <button
                                                        onClick={() => onAcknowledge(issue)}
                                                        className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                                        title="Acknowledge this issue instead"
                                                    >
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Acknowledge
                                                    </button>
                                                )}
                                            </div>
                                        ) : isAcknowledged ? (
                                            // Acknowledged - no action needed
                                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                <Check className="w-3 h-3 mr-1" />
                                                Acknowledged
                                            </span>
                                        ) : (
                                            // Pending - show action buttons
                                            <div className="flex items-center gap-2">
                                                {onCreateActionItem && (
                                                    <button
                                                        onClick={() => onCreateActionItem(issue)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                                                        title="Create action item for this issue"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Create Action
                                                    </button>
                                                )}
                                                {onAcknowledge && (
                                                    <button
                                                        onClick={() => onAcknowledge(issue)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                                        title="Acknowledge this issue (no action needed)"
                                                    >
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Acknowledge
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
