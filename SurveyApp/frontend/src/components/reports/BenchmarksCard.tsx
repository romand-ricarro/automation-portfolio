import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { BenchmarkData } from '../../types';

const METRIC_LABELS: Record<string, string> = {
    facilitator_understanding: 'Understanding',
    learning_mechanics: 'Learning Mechanics',
    qa_support: 'Q&A Support',
    problem_articulation: 'Articulation',
    session_pace: 'Pace',
    tools_helpfulness: 'Tools',
    repeatability: 'Repeatability',
    learning_objectives: 'Learning Obj.',
    overall_quality: 'Overall Quality',
};

// Pace uses a centered scale: 4-7 = "Just right", extremes are bad
const CENTERED_METRICS = ['session_pace'];
const PACE_IDEAL_CENTER = 5.5;

const isCenteredMetric = (metric: string) => CENTERED_METRICS.includes(metric);

const getCenteredColor = (value: number) => {
    if (value >= 4 && value <= 7) return 'text-green-600 dark:text-green-400';
    if (value >= 3 && value <= 8) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
};

const getStandardColor = (value: number) => {
    if (value >= 8) return 'text-green-600 dark:text-green-400';
    if (value >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
};

interface BenchmarksCardProps {
    sessionId: string;
}

export const BenchmarksCard: React.FC<BenchmarksCardProps> = ({ sessionId }) => {
    const [data, setData] = useState<BenchmarkData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBenchmarks = async () => {
            try {
                const { data } = await api.get(`/dashboard/benchmarks?session_id=${sessionId}`);
                setData(data);
            } catch (err: any) {
                const msg = err.response?.data?.error;
                // Don't show error for missing ratings — just hide the card
                if (msg === 'No ratings found for this session') {
                    setError('no-ratings');
                } else {
                    setError(msg || 'Failed to load benchmarks');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchBenchmarks();
    }, [sessionId]);

    if (loading) return <LoadingSpinner size="sm" className="my-4" />;
    if (error === 'no-ratings' || !data) return null;
    if (error) return <div className="text-sm text-red-500 py-2">{error}</div>;

    const metrics = Object.keys(METRIC_LABELS);

    const getDelta = (metric: string, session: number, avg: number) => {
        if (isCenteredMetric(metric)) {
            // For pace: closer to center (5.5) is better
            const sessionDist = Math.abs(session - PACE_IDEAL_CENTER);
            const avgDist = Math.abs(avg - PACE_IDEAL_CENTER);
            const diff = Math.round((avgDist - sessionDist) * 100) / 100;
            return { diff, isPositive: diff > 0, isNeutral: Math.abs(diff) < 0.05 };
        }
        const diff = Math.round((session - avg) * 100) / 100;
        return { diff, isPositive: diff > 0, isNeutral: Math.abs(diff) < 0.05 };
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Session Benchmarks
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Comparing this session against {data.facilitator_name}'s average and the global average.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Metric
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                This Session
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Facilitator Avg
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Global Avg
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                vs. Avg
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {metrics.map(metric => {
                            const sessionVal = data.session[metric] || 0;
                            const facAvg = data.facilitator_avg[metric] || 0;
                            const globalAvg = data.global_avg[metric] || 0;
                            const { diff, isPositive, isNeutral } = getDelta(metric, sessionVal, facAvg);

                            return (
                                <tr key={metric} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {METRIC_LABELS[metric]}
                                        {isCenteredMetric(metric) && (
                                            <span className="ml-1 text-xs text-gray-400 font-normal">(4-7 ideal)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        <span className={`font-bold ${
                                            isCenteredMetric(metric)
                                                ? getCenteredColor(sessionVal)
                                                : getStandardColor(sessionVal)
                                        }`}>
                                            {sessionVal.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-300">
                                        {facAvg.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                                        {globalAvg.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                            isNeutral ? 'text-gray-400' :
                                            isPositive ? 'text-green-600 dark:text-green-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                            {isNeutral ? (
                                                <Minus className="w-3 h-3" />
                                            ) : isPositive ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            {isNeutral ? '—' : `${isPositive ? '+' : ''}${diff.toFixed(1)}`}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
