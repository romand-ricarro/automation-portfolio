import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Edit2, Check, X } from 'lucide-react';
import api from '../../services/api';
import type { Session } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

export const SessionList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const { data } = await api.get('/sessions');
                setSessions(data);
            } catch (error) {
                console.error('Failed to fetch sessions', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSessions();
    }, []);

    const filteredSessions = sessions.filter(session =>
        session.session_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.facilitator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.session_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startEditing = (session: Session, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(session.id);
        setTempName(session.session_name || '');
    };

    const saveEdit = async (sessionId: string) => {
        if (!tempName.trim()) {
            cancelEdit();
            return;
        }
        try {
            await api.patch(`/sessions/${sessionId}`, { session_name: tempName });
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, session_name: tempName } : s
            ));
            setEditingId(null);
        } catch (error) {
            console.error('Failed to update session name', error);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setTempName('');
    };

    const handleRowClick = (sessionId: string) => {
        if (editingId) return; // Don't navigate while editing
        navigate(`/sessions/${sessionId}`);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sessions</h1>
                    {user?.role === 'facilitator' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Showing your sessions only</p>
                    )}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredSessions.map((session) => (
                        <li key={session.id}>
                            <div
                                onClick={() => handleRowClick(session.id)}
                                className="block hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                            >
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex items-center text-sm font-medium text-primary">
                                                {editingId === session.id ? (
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="text"
                                                            value={tempName}
                                                            onChange={(e) => setTempName(e.target.value)}
                                                            className="px-2 py-1 border border-primary rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveEdit(session.id);
                                                                if (e.key === 'Escape') cancelEdit();
                                                            }}
                                                            onBlur={() => saveEdit(session.id)}
                                                        />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); saveEdit(session.id); }}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="truncate">{session.session_name}</span>
                                                        {user?.role === 'admin' && (
                                                            <button
                                                                onClick={(e) => startEditing(session, e)}
                                                                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                                title="Rename session"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {session.session_id}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                <span className="truncate">{session.facilitator_name}</span>
                                                <span className="mx-2">•</span>
                                                <span>{new Date(session.session_date).toLocaleDateString()}</span>
                                                <span className="mx-2">•</span>
                                                <span>{session.num_responses} responses</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {session.status === 'analyzed' ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                    Analyzed
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                    Pending
                                                </span>
                                            )}
                                            <ChevronRight className="ml-4 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {filteredSessions.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No sessions found matching your search.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};
