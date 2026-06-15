import React, { useState } from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import type { QuestionAnalysis } from '../../types';

interface QuestionAnalysesProps {
    analyses: QuestionAnalysis[];
}

export const QuestionAnalyses: React.FC<QuestionAnalysesProps> = ({ analyses }) => {
    const [activeTab, setActiveTab] = useState(0);

    // Map backend labels to user-friendly tab names
    // Labels are: "learned", "apply", "need_to_learn", "comments"
    const labelToTitle: Record<string, string> = {
        'learned': 'Learned',
        'apply': 'Application',
        'need_to_learn': 'Needs',
        'comments': 'Comments'
    };

    const tabs = analyses.map(a => ({
        ...a,
        title: labelToTitle[a.question_label] || a.question_label
    }));

    if (analyses.length === 0) return <div className="text-gray-500 dark:text-gray-400 italic">No analysis data available.</div>;

    return (
        <div className="bento-card overflow-hidden">
            <div className="border-b border-gray-200 dark:border-white/5">
                <nav className="-mb-px flex overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(index)}
                            className={clsx(
                                index === activeTab
                                    ? 'border-primary text-primary dark:text-primary-light'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                                'whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200'
                            )}
                        >
                            {tab.title}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="p-6">
                <div className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:my-4 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:text-gray-600 dark:prose-ul:text-gray-300 prose-ul:my-3 prose-li:marker:text-primary prose-li:my-2 leading-relaxed [&>p]:mb-5">
                    <ReactMarkdown>
                        {tabs[activeTab].analysis_text}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};
