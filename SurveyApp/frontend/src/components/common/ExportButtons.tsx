/**
 * Export buttons component for downloading session reports.
 * Provides PDF and Excel export options.
 */
import React, { useState } from 'react';
import { exportSessionPdf, exportSessionExcel, downloadBlob } from '../../services/api';

interface ExportButtonsProps {
  sessionId: string;
  sessionCode: string;
  disabled?: boolean;
  formats?: ('pdf' | 'excel')[];
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  sessionId,
  sessionCode,
  disabled = false,
  formats = ['pdf', 'excel'],
}) => {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    if (loadingPdf || disabled) return;

    setLoadingPdf(true);
    setError(null);

    try {
      const blob = await exportSessionPdf(sessionId);
      downloadBlob(blob, `session_${sessionCode}_report.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (loadingExcel || disabled) return;

    setLoadingExcel(true);
    setError(null);

    try {
      const blob = await exportSessionExcel(sessionId);
      downloadBlob(blob, `session_${sessionCode}_report.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
      setError('Failed to export Excel. Please try again.');
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {formats.includes('pdf') && (
          <button
            onClick={handleExportPdf}
            disabled={disabled || loadingPdf}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              disabled || loadingPdf
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
            }`}
          >
            {loadingPdf ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            {loadingPdf ? 'Generating...' : 'PDF'}
          </button>
        )}

        {formats.includes('excel') && (
          <button
            onClick={handleExportExcel}
            disabled={disabled || loadingExcel}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              disabled || loadingExcel
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
            }`}
          >
            {loadingExcel ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {loadingExcel ? 'Generating...' : 'Excel'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default ExportButtons;
