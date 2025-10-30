import { useEffect } from 'react';
import { mutate } from 'swr';

export const useRealtimeAnalytics = (examId: string) => {
    useEffect(() => {
        if (!examId) return;

        // Refresh analytics every 30 seconds
        const interval = setInterval(() => {
            mutate(`/api/exam-analytics/dashboard?examId=${examId}`);
        }, 30000);

        return () => clearInterval(interval);
    }, [examId]);
};