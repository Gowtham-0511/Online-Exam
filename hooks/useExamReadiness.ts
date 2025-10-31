import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Optimized hook for fetching exam readiness data
 * Features:
 * - Memoization to prevent unnecessary re-renders
 * - Abort controller to cancel in-flight requests
 * - Stable exam comparison to avoid redundant fetches
 * - Debouncing to reduce API calls
 */

interface ExamReadinessData {
    exams: Record<string, {
        readinessScore: number;
        readinessLevel: string;
        color: string;
        recommendation: string;
        estimatedScore: number;
        insights: string[];
    }>;
}

interface UseExamReadinessReturn {
    readinessData: ExamReadinessData | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export const useExamReadiness = (
    email: string | null | undefined,
    exams: any[]
): UseExamReadinessReturn => {
    const [readinessData, setReadinessData] = useState<ExamReadinessData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Refs to manage state between renders
    const abortControllerRef = useRef<AbortController | null>(null);
    const previousExamsKeyRef = useRef<string>('');
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Create a stable key from exams array
    const examsKey = useMemo(() => {
        if (!exams || exams.length === 0) return '';
        return exams
            .map(e => `${e.id}-${e.title}`)
            .sort()
            .join('|');
    }, [exams]);

    // Refetch function
    const refetch = () => {
        previousExamsKeyRef.current = '';
        if (email && exams && exams.length > 0) {
            fetchReadiness();
        }
    };

    const fetchReadiness = async () => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/attender/exam-readiness', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, exams }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch readiness data: ${response.statusText}`);
            }

            const data = await response.json();
            setReadinessData(data);
        } catch (err: any) {
            // Don't set error for aborted requests
            if (err.name !== 'AbortError') {
                console.error('Error fetching readiness:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Clear any pending timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Reset state if no email or exams
        if (!email || !exams || exams.length === 0) {
            setReadinessData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        // Skip fetch if exams haven't changed
        if (examsKey === previousExamsKeyRef.current && readinessData) {
            return;
        }

        // Update the previous key
        previousExamsKeyRef.current = examsKey;

        // Debounce the API call
        fetchTimeoutRef.current = setTimeout(() => {
            fetchReadiness();
        }, 500);

        // Cleanup function
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [email, examsKey]); // Only depend on email and stable examsKey

    return {
        readinessData,
        isLoading,
        error,
        refetch,
    };
};

/**
 * Optional: Lazy version that only fetches when explicitly triggered
 * Useful for components that don't need readiness data immediately
 */
export const useLazyExamReadiness = () => {
    const [shouldFetch, setShouldFetch] = useState(false);
    const [params, setParams] = useState<{
        email: string | null;
        exams: any[];
    }>({ email: null, exams: [] });

    const result = useExamReadiness(
        shouldFetch ? params.email : null,
        shouldFetch ? params.exams : []
    );

    const fetch = (email: string, exams: any[]) => {
        setParams({ email, exams });
        setShouldFetch(true);
    };

    const reset = () => {
        setShouldFetch(false);
        setParams({ email: null, exams: [] });
    };

    return {
        ...result,
        fetch,
        reset,
    };
};
