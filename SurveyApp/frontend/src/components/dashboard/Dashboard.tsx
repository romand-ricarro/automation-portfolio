import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, List, FileSpreadsheet, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../services/api';
import type { DashboardStats } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { ImportModal } from './ImportModal';
import { ToastContainer, useToast } from '../common/Toast';

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const { toasts, removeToast, showSuccess, showError } = useToast();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/dashboard/stats');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImportClick = () => {
        setShowImportModal(true);
    };

    const handleImportConfirm = async () => {
        setShowImportModal(false);
        setImporting(true);
        try {
            const { data } = await api.post('/sessions/import');
            showSuccess(
                'Import Complete',
                `${data.imported_new} new session${data.imported_new !== 1 ? 's' : ''} created.`
            );
            fetchStats(); // Refresh
        } catch (error: any) {
            showError(
                'Import Failed',
                error.response?.data?.error || error.message
            );
        } finally {
            setImporting(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!stats) return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Failed to load dashboard</div>;

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Welcome back, {user?.name?.split(' ')[0] || 'User'}
                        {stats.scope === 'personal' && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary dark:bg-primary-light/10 dark:text-primary-light px-2 py-0.5 rounded-full">
                                Your Stats
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    {user?.role === 'admin' && (
                        <button
                            onClick={handleImportClick}
                            disabled={importing}
                            className="btn-gradient inline-flex items-center"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {importing ? 'Importing...' : 'Import from Sheets'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid - Bento Style */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Sessions"
                    value={stats.total_sessions}
                    icon={List}
                    gradient="from-blue-500 to-cyan-500"
                    iconBg="bg-blue-500/10 dark:bg-blue-500/20"
                />
                <StatCard
                    title="Open Items"
                    value={stats.open_action_items}
                    icon={Clock}
                    gradient="from-amber-500 to-orange-500"
                    iconBg="bg-amber-500/10 dark:bg-amber-500/20"
                />
                <StatCard
                    title="In Progress"
                    value={stats.in_progress_action_items}
                    icon={TrendingUp}
                    gradient="from-purple-500 to-pink-500"
                    iconBg="bg-purple-500/10 dark:bg-purple-500/20"
                />
                <StatCard
                    title="Avg Repeatability"
                    value={stats.average_repeatability}
                    icon={BarChart3}
                    gradient="from-emerald-500 to-teal-500"
                    iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
                    suffix="/5"
                />
            </div>

            {/* Recent Sessions - Bento Card */}
            <div className="bento-card overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sessions</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Latest training sessions and their status</p>
                    </div>
                    <Link
                        to="/sessions"
                        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors"
                    >
                        View all
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-white/5">
                    {(stats.recent_sessions || []).map((session) => (
                        <li key={session.id} className="group">
                            <Link
                                to={`/sessions/${session.id}`}
                                className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                                            {session.session_name}
                                        </p>
                                        <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <span className="font-mono text-xs bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded mr-2">
                                                {session.session_id}
                                            </span>
                                            {session.facilitator_name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                        <span className={clsx(
                                            "px-2.5 py-1 text-xs font-semibold rounded-full transition-all",
                                            session.status === 'analyzed'
                                                ? "bg-success/10 text-success border border-success/20"
                                                : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10"
                                        )}>
                                            {session.status}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                                            {new Date(session.session_date).toLocaleDateString()}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                    {(stats.recent_sessions || []).length === 0 && (
                        <li className="px-6 py-12 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                <List className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400">No sessions found</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Import data to get started</p>
                        </li>
                    )}
                </ul>
            </div>

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onConfirm={handleImportConfirm}
                isLoading={importing}
            />

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    gradient: string;
    iconBg: string;
    suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, gradient, iconBg, suffix }) => (
    <div className="bento-card p-6 group">
        <div className="flex items-start justify-between">
            <div className={`p-3 rounded-bento ${iconBg}`}>
                <Icon className={`h-6 w-6 bg-gradient-to-br ${gradient} bg-clip-text`} style={{ color: gradient.includes('blue') ? '#3b82f6' : gradient.includes('amber') ? '#f59e0b' : gradient.includes('purple') ? '#a855f7' : '#10b981' }} />
            </div>
        </div>
        <div className="mt-4">
            <p className="metric-label">{title}</p>
            <p className="metric-value mt-1">
                {value}
                {suffix && <span className="text-lg font-medium text-gray-400 dark:text-gray-500">{suffix}</span>}
            </p>
        </div>
    </div>
);
