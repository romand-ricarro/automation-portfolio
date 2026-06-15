import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('API request with token:', config.url, '- Token present: YES');
    } else {
        console.log('API request without token:', config.url, '- Token present: NO');
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

/**
 * Export session as PDF.
 * Returns a blob for download.
 */
export async function exportSessionPdf(sessionId: string): Promise<Blob> {
    const response = await api.get(`/sessions/${sessionId}/export/pdf`, {
        responseType: 'blob'
    });
    return response.data;
}

/**
 * Export session as Excel.
 * Returns a blob for download.
 */
export async function exportSessionExcel(sessionId: string): Promise<Blob> {
    const response = await api.get(`/sessions/${sessionId}/export/excel`, {
        responseType: 'blob'
    });
    return response.data;
}

/**
 * Trigger file download from blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * Acknowledge a common issue (mark as not needing action).
 */
export async function acknowledgeCommonIssue(issueId: string): Promise<void> {
    await api.patch(`/sessions/common-issues/${issueId}`, { status: 'acknowledged' });
}

export default api;
