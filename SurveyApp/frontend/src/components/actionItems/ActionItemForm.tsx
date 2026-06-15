import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';
import type { ActionItem, CommonIssue, Session } from '../../types';

// Strip markdown bold/italic markers from AI-generated text
const stripMarkdown = (text: string) => text.replace(/\*{1,2}(.*?)\*{1,2}/g, '$1');
import { useAuth } from '../../contexts/AuthContext';


interface ActionItemFormProps {
    initialData?: Partial<ActionItem>;
    sessionId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ActionItemForm: React.FC<ActionItemFormProps> = ({ initialData, sessionId, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        issue: initialData?.issue || '',
        action: initialData?.action || '',
        priority: initialData?.priority || 'Medium',
        person_in_charge: initialData?.person_in_charge || user?.name || '',
        deadline: initialData?.deadline || '',
        status: initialData?.status || 'Open',
        notes: initialData?.notes || '',
        session_id: initialData?.session_id || sessionId || ''
    });

    const [loading, setLoading] = useState(false);
    const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [userNames, setUserNames] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        // Fetch all sessions for the dropdown
        api.get('/sessions')
            .then(({ data }) => setSessions(data))
            .catch(console.error);

        // Fetch user names for Person in Charge dropdown
        api.get('/users/names')
            .then(({ data }) => setUserNames(data))
            .catch(console.error);
    }, []);

    useEffect(() => {
        // If session_id is present, fetch common issues for that session
        const sid = formData.session_id;
        if (sid) {
            api.get(`/sessions/${sid}`)
                .then(({ data }) => {
                    setCommonIssues(data.common_issues || []);
                })
                .catch(console.error);
        } else {
            setCommonIssues([]);
        }
    }, [formData.session_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert empty strings to null for optional fields
            const payload = {
                ...formData,
                deadline: formData.deadline || null,
                person_in_charge: formData.person_in_charge || null,
                notes: formData.notes || null,
            };
            if (initialData?.id) {
                // Strip session_id — backend update schema doesn't accept it
                const { session_id, ...updatePayload } = payload;
                await api.put(`/action-items/${initialData.id}`, updatePayload);
            } else {
                await api.post('/action-items', payload);
            }
            onSuccess();
        } catch (error: any) {
            alert('Failed to save: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-[110] flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-4xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {initialData?.id ? 'Edit Action Item' : 'New Action Item'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Form Side */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <form id="action-form" onSubmit={handleSubmit} className="space-y-4">
                            {/* Session Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Session</label>
                                <select
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                    value={formData.session_id}
                                    onChange={e => {
                                        setFormData({ ...formData, session_id: e.target.value, issue: '' });
                                    }}
                                    disabled={!!sessionId || !!initialData?.id}
                                >
                                    <option value="">Select a session...</option>
                                    {sessions.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.session_name} ({new Date(s.session_date).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Issue Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Issue</label>
                                {commonIssues.length > 0 ? (
                                    <select
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                        value={formData.issue}
                                        onChange={e => setFormData({ ...formData, issue: e.target.value })}
                                    >
                                        <option value="">Select a common issue...</option>
                                        {commonIssues.map(ci => (
                                            <option key={ci.id} value={ci.common_issue}>
                                                {stripMarkdown(ci.common_issue)}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            {formData.session_id
                                                ? 'No common issues found for this session. Please run AI analysis first.'
                                                : 'Please select a session first.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                    value={formData.action}
                                    onChange={e => setFormData({ ...formData, action: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="On Hold">On Hold</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Person in Charge</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                        value={formData.person_in_charge}
                                        onChange={e => setFormData({ ...formData, person_in_charge: e.target.value })}
                                    >
                                        <option value="">Select a person...</option>
                                        {userNames.map(u => (
                                            <option key={u.id} value={u.name}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                                        value={formData.deadline}
                                        onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Sidebar / Reference Panel */}
                    {formData.issue && commonIssues.length > 0 && (
                        <div className="w-1/3 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 overflow-y-auto hidden md:block">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                                Selected Issue Details
                            </h4>

                            <div className="space-y-3">
                                {commonIssues.filter(ci => ci.common_issue === formData.issue).map(issue => (
                                    <div key={issue.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{stripMarkdown(issue.common_issue)}</p>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <p className="font-medium text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500 mb-1">Evidence/Signal:</p>
                                            <p className="italic">{stripMarkdown(issue.evidence_signal)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="action-form"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Action Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};
