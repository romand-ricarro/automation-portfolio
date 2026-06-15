/**
 * SSE client hook for real-time analysis progress.
 * Connects to the analysis streaming endpoint and provides progress updates.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface AnalysisProgress {
  step: string;
  message: string;
  progress: number; // 0-100
  current?: number;
  total?: number;
  cached?: boolean;
  cached_at?: string;
}

export interface AnalysisError {
  error: string;
  code: string;
}

export interface UseAnalysisProgressResult {
  startAnalysis: (sessionId: string, force?: boolean) => void;
  cancelAnalysis: () => void;
  progress: AnalysisProgress | null;
  isAnalyzing: boolean;
  error: AnalysisError | null;
  isComplete: boolean;
  isCached: boolean;
}

export function useAnalysisProgress(onComplete?: () => void): UseAnalysisProgressResult {
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const cancelAnalysis = useCallback(() => {
    cleanup();
    setIsAnalyzing(false);
    setProgress(null);
  }, [cleanup]);

  const startAnalysis = useCallback(async (sessionId: string, force: boolean = false) => {
    // Reset state
    setProgress(null);
    setError(null);
    setIsComplete(false);
    setIsCached(false);
    setIsAnalyzing(true);

    // Cleanup any existing connection
    cleanup();

    try {
      // Get auth token for SSE (SSE doesn't support headers, so we use query param)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError({ error: 'Not authenticated', code: 'AUTH_ERROR' });
        setIsAnalyzing(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      // Handle relative URLs (like /api) by prepending origin
      const baseUrl = apiUrl.startsWith('/') ? `${window.location.origin}${apiUrl}` : apiUrl;
      const url = new URL(`${baseUrl}/sessions/${sessionId}/analyze/stream`);
      url.searchParams.set('token', session.access_token);
      if (force) {
        url.searchParams.set('force', 'true');
      }

      // Create EventSource for SSE
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Check for error
          if (data.error) {
            setError({ error: data.error, code: data.code || 'UNKNOWN_ERROR' });
            setIsAnalyzing(false);
            cleanup();
            return;
          }

          // Check for completion
          if (data.step === 'complete') {
            setProgress(data);
            setIsComplete(true);
            setIsAnalyzing(false);
            setIsCached(data.cached === true);
            cleanup();

            // Trigger callback
            if (onComplete) {
              onComplete();
            }
            return;
          }

          // Update progress
          setProgress(data);
          if (data.cached) {
            setIsCached(true);
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      };

      eventSource.onerror = (e) => {
        console.error('SSE connection error:', e);
        setError({
          error: 'Connection to analysis service lost. Please try again.',
          code: 'CONNECTION_ERROR'
        });
        setIsAnalyzing(false);
        cleanup();
      };

    } catch (e) {
      console.error('Failed to start analysis:', e);
      setError({
        error: e instanceof Error ? e.message : 'Failed to start analysis',
        code: 'START_ERROR'
      });
      setIsAnalyzing(false);
    }
  }, [cleanup, onComplete]);

  return {
    startAnalysis,
    cancelAnalysis,
    progress,
    isAnalyzing,
    error,
    isComplete,
    isCached,
  };
}
