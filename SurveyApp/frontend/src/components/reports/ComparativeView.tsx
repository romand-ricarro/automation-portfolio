import React, { useEffect, useState } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from 'recharts';
import { Users } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { ComparisonData, FacilitatorHistory } from '../../types';

const METRIC_LABELS: Record<string, string> = {
    facilitator_understanding: 'Understanding',
    learning_mechanics: 'Learning Mechanics',
    qa_support: 'Q&A Support',
    problem_articulation: 'Articulation',
    session_pace: 'Pace (4-7 ideal)',
    tools_helpfulness: 'Tools',
    repeatability: 'Repeatability',
    learning_objectives: 'Learning Obj.',
    overall_quality: 'Overall',
};

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export const ComparativeView: React.FC = () => {
    const { user } = useAuth();
    const isFacilitator = user?.role === 'facilitator';

    const [facilitatorNames, setFacilitatorNames] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [trendData, setTrendData] = useState<Record<string, FacilitatorHistory[]>>({});
    const [loading, setLoading] = useState(true);
    const [trendLoading, setTrendLoading] = useState(false);

    // Fetch available facilitator names on mount
    useEffect(() => {
        const fetchNames = async () => {
            try {
                const { data } = await api.get('/dashboard/performance');
                const names = data.map((d: { facilitator_name: string }) => d.facilitator_name);
                setFacilitatorNames(names);

                // Auto-select: facilitators see themselves, admins see first 2
                if (isFacilitator) {
                    setSelected(user?.name ? [user.name] : []);
                } else if (names.length > 0) {
                    setSelected(names.slice(0, Math.min(2, names.length)));
                }
            } catch (error) {
                console.error('Failed to fetch facilitator names', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNames();
    }, []);

    // Fetch comparison data when selection changes
    useEffect(() => {
        if (selected.length === 0) {
            setComparisonData([]);
            return;
        }

        const fetchComparison = async () => {
            try {
                const params = isFacilitator ? '' : `?facilitators=${selected.map(encodeURIComponent).join(',')}`;
                const { data } = await api.get(`/dashboard/comparison${params}`);
                setComparisonData(data);
            } catch (error) {
                console.error('Failed to fetch comparison data', error);
            }
        };
        fetchComparison();
    }, [selected]);

    // Fetch trend data when selection changes
    useEffect(() => {
        if (selected.length === 0) {
            setTrendData({});
            return;
        }

        const fetchTrends = async () => {
            setTrendLoading(true);
            try {
                const results: Record<string, FacilitatorHistory[]> = {};
                await Promise.all(
                    selected.map(async (name) => {
                        const { data } = await api.get(
                            `/dashboard/facilitator-history?name=${encodeURIComponent(name)}`
                        );
                        results[name] = data;
                    })
                );
                setTrendData(results);
            } catch (error) {
                console.error('Failed to fetch trend data', error);
            } finally {
                setTrendLoading(false);
            }
        };
        fetchTrends();
    }, [selected]);

    const toggleFacilitator = (name: string) => {
        setSelected(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : prev.length < 4 ? [...prev, name] : prev
        );
    };

    // Transform comparison data for radar chart
    const radarData = Object.keys(METRIC_LABELS).map(metric => {
        const point: Record<string, string | number> = { metric: METRIC_LABELS[metric] };
        comparisonData.forEach(cd => {
            point[cd.facilitator_name] = cd.metrics[metric] || 0;
        });
        return point;
    });

    // Transform trend data for line chart — merge all facilitators into shared date points
    const buildTrendChartData = () => {
        const dateMap = new Map<string, Record<string, number | string>>();

        Object.entries(trendData).forEach(([name, sessions]) => {
            sessions.forEach(s => {
                if (!s.date || s.overall_quality === null) return;
                const dateKey = s.date;
                if (!dateMap.has(dateKey)) {
                    dateMap.set(dateKey, {
                        date: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
                        sortKey: dateKey,
                    });
                }
                dateMap.get(dateKey)![name] = s.overall_quality;
            });
        });

        return Array.from(dateMap.values()).sort((a, b) =>
            String(a.sortKey).localeCompare(String(b.sortKey))
        );
    };

    const trendChartData = buildTrendChartData();

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8">
            {/* Facilitator Selector */}
            {!isFacilitator && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Select Facilitators to Compare (max 4)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {facilitatorNames.map((name) => (
                            <button
                                key={name}
                                onClick={() => toggleFacilitator(name)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                    selected.includes(name)
                                        ? 'border-primary bg-primary/10 text-primary dark:text-primary-light'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {selected.includes(name) && (
                                    <span
                                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                                        style={{ backgroundColor: COLORS[selected.indexOf(name) % COLORS.length] }}
                                    />
                                )}
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selected.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Select facilitators to compare
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Choose at least one facilitator above to see comparative analytics.
                    </p>
                </div>
            ) : (
                <>
                    {/* Radar Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Performance Radar — All 9 Metrics
                        </h3>
                        {comparisonData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                                    <PolarGrid stroke="#e5e7eb" />
                                    <PolarAngleAxis
                                        dataKey="metric"
                                        tick={{ fontSize: 11, fill: '#6b7280' }}
                                    />
                                    <PolarRadiusAxis
                                        angle={90}
                                        domain={[0, 10]}
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    />
                                    {comparisonData.map((cd, idx) => (
                                        <Radar
                                            key={cd.facilitator_name}
                                            name={cd.facilitator_name}
                                            dataKey={cd.facilitator_name}
                                            stroke={COLORS[idx % COLORS.length]}
                                            fill={COLORS[idx % COLORS.length]}
                                            fillOpacity={0.15}
                                            strokeWidth={2}
                                        />
                                    ))}
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">Loading comparison data...</div>
                        )}
                    </div>

                    {/* Trend Comparison */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Overall Quality Trend Over Time
                        </h3>
                        {trendLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <LoadingSpinner />
                            </div>
                        ) : trendChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#6b7280' }}
                                    />
                                    <YAxis
                                        domain={[0, 10]}
                                        tick={{ fontSize: 11, fill: '#6b7280' }}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    {/* Benchmark line at 8.0 */}
                                    <Line
                                        type="monotone"
                                        dataKey={() => 8}
                                        name="Benchmark (8.0)"
                                        stroke="#22c55e"
                                        strokeDasharray="4 2"
                                        strokeWidth={1.5}
                                        dot={false}
                                        legendType="none"
                                    />
                                    {selected.map((name, idx) => (
                                        <Line
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            stroke={COLORS[idx % COLORS.length]}
                                            strokeWidth={2.5}
                                            dot={{ r: 4 }}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No trend data available for selected facilitators.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
