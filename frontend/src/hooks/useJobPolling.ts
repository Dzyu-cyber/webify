import { useState, useEffect, useRef } from 'react';

export interface IJobStatusResponse {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  result?: string;
  failedReason?: string;
}

/**
 * Custom hook to poll the backend job status endpoint on an interval.
 */
export function useJobPolling(apiBaseUrl: string) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<IJobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const startPolling = (id: string) => {
    setJobId(id);
    setError(null);
    setStatus(null);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/jobs/${jobId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Job not found.');
            stopPolling();
            return;
          }
          throw new Error('Failed to retrieve job status.');
        }

        const data: IJobStatusResponse = await res.json();
        setStatus(data);

        // Terminate polling on completion or failure
        if (data.state === 'completed' || data.state === 'failed') {
          stopPolling();
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err.message || 'An error occurred during polling.');
        stopPolling();
      }
    };

    // Run first check immediately
    checkStatus();
    
    // Set up polling interval (every 2 seconds)
    pollIntervalRef.current = window.setInterval(checkStatus, 2000);

    return () => stopPolling();
  }, [jobId, apiBaseUrl]);

  return {
    status,
    error,
    startPolling,
    stopPolling,
    isPolling: pollIntervalRef.current !== null,
  };
}
