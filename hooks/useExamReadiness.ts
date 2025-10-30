import { useState, useEffect } from 'react';

export const useExamReadiness = (email: string | null | undefined, exams: any[]) => {
    const [readinessData, setReadinessData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!email || !exams || exams.length === 0) {
            setReadinessData(null);
            return;
        }

        const fetchReadiness = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/attender/exam-readiness', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, exams })
                });

                if (response.ok) {
                    const data = await response.json();
                    setReadinessData(data);
                } else {
                    setError('Failed to fetch readiness data');
                }
            } catch (err) {
                setError(err);
                console.error('Error fetching readiness:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce the API call
        const timer = setTimeout(fetchReadiness, 500);
        return () => clearTimeout(timer);
    }, [email, exams.length]);

    return { readinessData, isLoading, error };
};