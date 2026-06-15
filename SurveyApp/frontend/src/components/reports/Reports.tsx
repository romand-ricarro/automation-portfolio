import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  Star,
  GraduationCap,
  ArrowUpRight,
  TrendingUp,
  X,
  GitCompare,
} from "lucide-react";
import api from "../../services/api";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ComparativeView } from "./ComparativeView";

interface FacilitatorHistory {
  session_id: string;
  session_name: string;
  date: string;
  num_responses: number;
  facilitator_understanding: number | null;
  learning_mechanics: number | null;
  qa_support: number | null;
  problem_articulation: number | null;
  session_pace: number | null;
  tools_helpfulness: number | null;
  repeatability: number | null;
  learning_objectives: number | null;
  overall_quality: number | null;
}

interface FacilitatorPerformance {
  facilitator_name: string;
  avg_understanding: number;
  avg_qa: number;
  avg_articulation: number;
  avg_overall: number;
  session_count: number;
  total_responses: number;
}

type ReportsTab = 'cards' | 'comparative';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportsTab>('cards');
  const [performance, setPerformance] = useState<FacilitatorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacilitator, setSelectedFacilitator] = useState<string | null>(
    null
  );
  const [history, setHistory] = useState<FacilitatorHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const { data } = await api.get("/dashboard/performance");
        setPerformance(data);
      } catch (error) {
        console.error("Failed to fetch facilitator performance", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const handleViewHistory = async (facilitatorName: string) => {
    setSelectedFacilitator(facilitatorName);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(
        `/dashboard/facilitator-history?name=${encodeURIComponent(facilitatorName)}`
      );
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch facilitator history", error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedFacilitator(null);
    setHistory([]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 italic">
            Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Facilitator performance and training quality metrics.
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'cards'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Facilitator Cards
          </button>
          <button
            onClick={() => setActiveTab('comparative')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'comparative'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Comparative View
          </button>
        </div>
      </div>

      {activeTab === 'comparative' ? (
        <ComparativeView />
      ) : (
      <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {performance.map((facilitator) => (
          <div
            key={facilitator.facilitator_name}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {facilitator.facilitator_name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {facilitator.session_count} Sessions •{" "}
                      {facilitator.total_responses} Responses
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">
                    {facilitator.avg_overall.toFixed(1)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                    Overall Rating
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <MetricBar
                label="Facilitator Understanding"
                value={facilitator.avg_understanding}
                icon={<GraduationCap className="w-4 h-4" />}
                color="bg-blue-500"
              />
              <MetricBar
                label="Q&A Support"
                value={facilitator.avg_qa}
                icon={<Star className="w-4 h-4" />}
                color="bg-purple-500"
              />
              <MetricBar
                label="Problem Articulation"
                value={facilitator.avg_articulation}
                icon={<ArrowUpRight className="w-4 h-4" />}
                color="bg-indigo-500"
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/30 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-400">
                BENCHMARK: 8.0
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      facilitator.avg_overall >= 8.0
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span
                    className={`text-xs font-bold ${
                      facilitator.avg_overall >= 8.0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {facilitator.avg_overall >= 8.0
                      ? "Exceeds Goal"
                      : "Needs Review"}
                  </span>
                </div>
                <button
                  onClick={() => handleViewHistory(facilitator.facilitator_name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  View History
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {performance.length === 0 && (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            No performance data yet
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Once sessions are analyzed, you'll see facilitator metrics grouped
            here.
          </p>
        </div>
      )}

      </>
      )}

      {/* Insights Modal */}
      {selectedFacilitator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Performance History
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedFacilitator}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No session history found for this facilitator.
                </div>
              ) : (
                <>
                  {/* Trend Line Chart */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      Overall Quality Trend
                    </h3>
                    <TrendChart data={history} />
                  </div>

                  {/* Session History Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Session History
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Session
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Responses
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Understanding
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Overall
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {history.map((session) => (
                            <tr
                              key={session.session_id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                {session.date
                                  ? new Date(session.date).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {session.session_name || session.session_id}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                {session.num_responses ?? "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`text-sm font-medium ${
                                    session.facilitator_understanding &&
                                    session.facilitator_understanding >= 8
                                      ? "text-green-600"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {session.facilitator_understanding?.toFixed(
                                    1
                                  ) ?? "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${
                                    session.overall_quality &&
                                    session.overall_quality >= 8
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                      : session.overall_quality &&
                                          session.overall_quality >= 6
                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                  }`}
                                >
                                  {session.overall_quality?.toFixed(1) ?? "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, icon, color }) => {
  const percentage = (value / 10) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="text-gray-400">{icon}</span>
          {label}
        </div>
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {value.toFixed(1)}
        </div>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// SVG Trend Line Chart Component
interface TrendChartProps {
  data: FacilitatorHistory[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const width = 700;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Filter data points with valid overall_quality
  const validData = data.filter((d) => d.overall_quality !== null);

  if (validData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No rating data available for chart.
      </div>
    );
  }

  // Scale calculations (Y-axis: 0-10)
  const yMin = 0;
  const yMax = 10;
  const xScale = (index: number) =>
    padding.left + (index / (validData.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) =>
    padding.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

  // Generate path for the line
  const linePath = validData
    .map(
      (d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.overall_quality!)}`
    )
    .join(" ");

  // Y-axis labels
  const yLabels = [0, 2, 4, 6, 8, 10];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Green zone (above 8.0) */}
      <rect
        x={padding.left}
        y={yScale(10)}
        width={chartWidth}
        height={yScale(8) - yScale(10)}
        fill="rgb(34, 197, 94)"
        opacity={0.1}
      />

      {/* Red zone (below 6.0) */}
      <rect
        x={padding.left}
        y={yScale(6)}
        width={chartWidth}
        height={yScale(0) - yScale(6)}
        fill="rgb(239, 68, 68)"
        opacity={0.1}
      />

      {/* Grid lines */}
      {yLabels.map((label) => (
        <g key={label}>
          <line
            x1={padding.left}
            y1={yScale(label)}
            x2={width - padding.right}
            y2={yScale(label)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray={label === 8 ? "4,2" : "none"}
            strokeWidth={label === 8 ? 1.5 : 1}
            className="text-gray-400"
          />
          <text
            x={padding.left - 8}
            y={yScale(label)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-gray-400 text-xs"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Benchmark line at 8.0 */}
      <line
        x1={padding.left}
        y1={yScale(8)}
        x2={width - padding.right}
        y2={yScale(8)}
        stroke="rgb(34, 197, 94)"
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />

      {/* Trend line */}
      <path
        d={linePath}
        fill="none"
        stroke="rgb(79, 70, 229)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {validData.map((d, i) => (
        <g key={d.session_id}>
          <circle
            cx={xScale(i)}
            cy={yScale(d.overall_quality!)}
            r={6}
            fill={
              d.overall_quality! >= 8
                ? "rgb(34, 197, 94)"
                : d.overall_quality! >= 6
                  ? "rgb(234, 179, 8)"
                  : "rgb(239, 68, 68)"
            }
            stroke="white"
            strokeWidth={2}
          />
          {/* X-axis labels (session dates) */}
          <text
            x={xScale(i)}
            y={height - padding.bottom + 16}
            textAnchor="middle"
            className="fill-gray-400 text-[10px]"
          >
            {d.date
              ? new Date(d.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : `S${i + 1}`}
          </text>
        </g>
      ))}

      {/* Y-axis label */}
      <text
        x={12}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90, 12, ${height / 2})`}
        className="fill-gray-400 text-xs"
      >
        Overall Score
      </text>
    </svg>
  );
};
