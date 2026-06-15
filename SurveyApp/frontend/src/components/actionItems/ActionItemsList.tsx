import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Filter, Edit, Trash2, AlertTriangle, ChevronDown, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../services/api';
import type { ActionItem, ActionItemStatus, ActionItemPriority } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ActionItemForm } from './ActionItemForm';
import { useAuth } from '../../contexts/AuthContext';

// Strip markdown bold/italic markers from AI-generated text
const stripMarkdown = (text: string) => text.replace(/\*{1,2}(.*?)\*{1,2}/g, '$1');

const PRIORITY_OPTIONS: ActionItemPriority[] = ['High', 'Medium', 'Low'];
const STATUS_OPTIONS: ActionItemStatus[] = ['Open', 'In Progress', 'Completed', 'On Hold'];

const priorityStyles: Record<ActionItemPriority, string> = {
    'High': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    'Low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
};

const statusStyles: Record<ActionItemStatus, string> = {
    'Open': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
    'On Hold': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
};

type TabType = 'my-sessions' | 'assigned';

export const ActionItemsList: React.FC = () => {
    const [searchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('session_id');

    const { user } = useAuth();
    const [items, setItems] = useState<ActionItem[]>([]);
    const [assignedItems, setAssignedItems] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('my-sessions');
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        approval: '',
        session_id: sessionIdParam || ''
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ActionItem | undefined>(undefined);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; issue: string } | null>(null);

    const isFacilitator = user?.role === 'facilitator';
    const canEdit = user?.role === 'admin' || user?.role === 'facilitator';

    useEffect(() => {
        fetchItems();
        if (isFacilitator) {
            fetchAssignedItems();
        }
    }, [filters, isFacilitator]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.session_id) params.append('session_id', filters.session_id);

            const { data } = await api.get(`/action-items?${params.toString()}`);
            setItems(data);
        } catch (error) {
            console.error('Failed', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedItems = async () => {
        try {
            const { data } = await api.get('/action-items/assigned');
            setAssignedItems(data);
        } catch (error) {
            console.error('Failed to fetch assigned items', error);
        }
    };

    // Get the current items based on active tab, apply approval filter, sort approved to bottom
    const displayedItems = (() => {
        let list = activeTab === 'assigned' ? assignedItems : items;
        // Approval filter
        if (filters.approval === 'approved') {
            list = list.filter(item => !!item.approved_at);
        } else if (filters.approval === 'not_approved') {
            list = list.filter(item => !item.approved_at);
        }
        // Sort: approved items sink to bottom
        return [...list].sort((a, b) => {
            const aApproved = !!a.approved_at;
            const bApproved = !!b.approved_at;
            if (aApproved !== bApproved) return aApproved ? 1 : -1;
            return 0; // preserve original order within groups
        });
    })();

    // For assigned items, user can only modify status (not edit/delete)
    const canModifyItem = (item: ActionItem) => {
        if (!canEdit) return false;
        // Assigned items from other sessions are read-only (except status updates)
        if (activeTab === 'assigned') return false;
        if (item.is_assigned) return false;
        return true;
    };

    const handleInlineUpdate = async (id: string, field: 'status' | 'priority', value: string) => {
        setUpdating(id);
        try {
            await api.put(`/action-items/${id}`, { [field]: value });
            // Update local state immediately for responsiveness
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            ));
        } catch (error) {
            console.error('Failed to update', error);
            // Refresh to get correct state on error
            fetchItems();
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteClick = (item: ActionItem) => {
        setDeleteConfirm({ id: item.id, issue: item.issue });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await api.delete(`/action-items/${deleteConfirm.id}`);
            fetchItems();
        } catch (error) {
            console.error(error);
        } finally {
            setDeleteConfirm(null);
        }
    };

    const handleApproval = async (id: string, currentlyApproved: boolean) => {
        setUpdating(id);
        try {
            const { data } = currentlyApproved
                ? await api.delete(`/action-items/${id}/approve`)
                : await api.put(`/action-items/${id}/approve`);
            // Update local state with server response (no full reload)
            setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
            setAssignedItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
        } catch (error) {
            console.error('Failed to update approval', error);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Action Items</h1>
                {canEdit && activeTab !== 'assigned' && (
                    <button
                        onClick={() => { setEditingItem(undefined); setIsModalOpen(true); }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Action Item
                    </button>
                )}
            </div>

            {/* Tabs for facilitators */}
            {isFacilitator && (
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('my-sessions')}
                            className={clsx(
                                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                                activeTab === 'my-sessions'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            )}
                        >
                            My Sessions
                            <span className={clsx(
                                'ml-2 py-0.5 px-2 rounded-full text-xs',
                                activeTab === 'my-sessions'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            )}>
                                {items.filter(i => !i.is_assigned).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('assigned')}
                            className={clsx(
                                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                                activeTab === 'assigned'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            )}
                        >
                            Assigned to Me
                            <span className={clsx(
                                'ml-2 py-0.5 px-2 rounded-full text-xs',
                                activeTab === 'assigned'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            )}>
                                {assignedItems.length}
                            </span>
                        </button>
                    </nav>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-wrap gap-4 items-center">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                    className="rounded-md border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-700 dark:text-white"
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                </select>

                <select
                    className="rounded-md border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-700 dark:text-white"
                    value={filters.priority}
                    onChange={e => setFilters({ ...filters, priority: e.target.value })}
                >
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>

                <select
                    className="rounded-md border-gray-300 dark:border-gray-600 text-sm dark:bg-gray-700 dark:text-white"
                    value={filters.approval}
                    onChange={e => setFilters({ ...filters, approval: e.target.value })}
                >
                    <option value="">All Approvals</option>
                    <option value="approved">Approved</option>
                    <option value="not_approved">Not Approved</option>
                </select>

                {filters.session_id && (
                    <button
                        onClick={() => setFilters({ ...filters, session_id: '' })}
                        className="text-xs text-primary hover:text-primary-dark underline"
                    >
                        Clear session filter
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-x-auto sm:rounded-lg">
                {loading ? <LoadingSpinner /> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Issue / Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owner</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deadline</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approved</th>
                                    <th className="px-4 py-3 relative"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {displayedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        {/* Priority - Inline editable (only for own sessions) */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {canModifyItem(item) ? (
                                                <div className="relative inline-block">
                                                    <select
                                                        value={item.priority}
                                                        onChange={(e) => handleInlineUpdate(item.id, 'priority', e.target.value)}
                                                        disabled={updating === item.id}
                                                        className={clsx(
                                                            "appearance-none cursor-pointer pl-2 pr-6 py-0.5 text-xs font-semibold rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
                                                            priorityStyles[item.priority],
                                                            updating === item.id && "opacity-50"
                                                        )}
                                                    >
                                                        {PRIORITY_OPTIONS.map(p => (
                                                            <option key={p} value={p}>{p}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                                                </div>
                                            ) : (
                                                <span className={clsx(
                                                    "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                                    priorityStyles[item.priority]
                                                )}>
                                                    {item.priority}
                                                </span>
                                            )}
                                        </td>
                                        {/* Status - Inline editable (only for own sessions) */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {canModifyItem(item) ? (
                                                <div className="relative inline-block">
                                                    <select
                                                        value={item.status}
                                                        onChange={(e) => handleInlineUpdate(item.id, 'status', e.target.value)}
                                                        disabled={updating === item.id}
                                                        className={clsx(
                                                            "appearance-none cursor-pointer pl-2 pr-6 py-0.5 text-xs font-semibold rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
                                                            statusStyles[item.status],
                                                            updating === item.id && "opacity-50"
                                                        )}
                                                    >
                                                        {STATUS_OPTIONS.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                                                </div>
                                            ) : (
                                                <span className={clsx(
                                                    "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                                    statusStyles[item.status]
                                                )}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            {item.session_name ? (
                                                item.is_assigned ? (
                                                    // For assigned items, show session name but don't link to it
                                                    <div title={item.session_name}>
                                                        <span className="block max-w-[200px] truncate text-gray-700 dark:text-gray-300">{item.session_name}</span>
                                                        {item.session_short_id && (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">{item.session_short_id}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Link
                                                        to={`/sessions/${item.session_id}`}
                                                        className="text-primary hover:text-primary-dark hover:underline"
                                                        title={item.session_name}
                                                    >
                                                        <span className="block max-w-[200px] truncate">{item.session_name}</span>
                                                        {item.session_short_id && (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">{item.session_short_id}</span>
                                                        )}
                                                    </Link>
                                                )
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{stripMarkdown(item.issue)}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.action}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {item.person_in_charge || '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {item.deadline ? new Date(item.deadline).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            {item.approved_at ? (
                                                user?.role === 'admin' ? (
                                                    <button
                                                        onClick={() => handleApproval(item.id, true)}
                                                        disabled={updating === item.id}
                                                        className={clsx(
                                                            "flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300",
                                                            updating === item.id && "opacity-50 cursor-not-allowed"
                                                        )}
                                                        title="Click to remove approval"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-xs">
                                                            {item.approver_name && `by ${item.approver_name}`}
                                                            {item.approved_at && ` on ${new Date(item.approved_at).toLocaleDateString()}`}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-xs">
                                                            {item.approver_name && `by ${item.approver_name}`}
                                                            {item.approved_at && ` on ${new Date(item.approved_at).toLocaleDateString()}`}
                                                        </span>
                                                    </div>
                                                )
                                            ) : user?.role === 'admin' ? (
                                                <button
                                                    onClick={() => handleApproval(item.id, false)}
                                                    disabled={updating === item.id}
                                                    className={clsx(
                                                        "flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors",
                                                        "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400",
                                                        "hover:border-green-500 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-400",
                                                        updating === item.id && "opacity-50 cursor-not-allowed"
                                                    )}
                                                    title="Click to approve"
                                                >
                                                    <div className="w-4 h-4 border border-current rounded" />
                                                    <span>Approve</span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs italic">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {canModifyItem(item) && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                                        className="text-primary hover:text-primary-dark"
                                                        title="Edit all details"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(item)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {displayedItems.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                                            {activeTab === 'assigned'
                                                ? 'No action items assigned to you.'
                                                : 'No action items found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <ActionItemForm
                    initialData={editingItem}
                    sessionId={filters.session_id}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); fetchItems(); }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Delete Action Item
                            </h2>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                Are you sure you want to delete this action item?
                            </p>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2">
                                "{deleteConfirm.issue}"
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
