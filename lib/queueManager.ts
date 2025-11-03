import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

export interface QueueJob {
    id: string;
    type: 'python' | 'sql';
    code: string;
    examId: string;
    userEmail: string;
    timestamp: number;
    priority: number;
    timeout?: number;
}

export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
}

export class QueueManager {
    private readonly QUEUE_PREFIX = 'exam:queue:';
    private readonly ACTIVE_PREFIX = 'exam:active:';
    private readonly RESULT_PREFIX = 'exam:result:';
    private readonly STATS_KEY = `exam:stats:${this.queueType}`;

    constructor(private queueType: 'python' | 'sql') { }

    async addJob(job: Omit<QueueJob, 'id' | 'timestamp'>): Promise<string> {
        const jobId = `${this.queueType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullJob: QueueJob = {
            ...job,
            id: jobId,
            timestamp: Date.now(),
            type: this.queueType,
        };

        const score = fullJob.priority || 0;
        await redis.zadd(
            `${this.QUEUE_PREFIX}${this.queueType}`,
            score,
            JSON.stringify(fullJob)
        );

        await redis.hincrby(this.STATS_KEY, 'waiting', 1);

        console.log(`📥 Job ${jobId} added to ${this.queueType} queue`);
        return jobId;
    }

    async getNextJob(): Promise<QueueJob | null> {
        const queueKey = `${this.QUEUE_PREFIX}${this.queueType}`;

        const jobs = await redis.zrange(queueKey, 0, 0);

        if (jobs.length === 0) return null;

        const jobData = JSON.parse(jobs[0]);

        await redis.zrem(queueKey, jobs[0]);
        await redis.setex(
            `${this.ACTIVE_PREFIX}${jobData.id}`,
            300,
            JSON.stringify(jobData)
        );

        await redis.hincrby(this.STATS_KEY, 'waiting', -1);
        await redis.hincrby(this.STATS_KEY, 'active', 1);

        console.log(`📤 Job ${jobData.id} dequeued from ${this.queueType} queue`);
        return jobData;
    }

    async storeResult(jobId: string, result: any, success: boolean): Promise<void> {
        const resultData = {
            jobId,
            result,
            success,
            timestamp: Date.now(),
        };

        await redis.setex(
            `${this.RESULT_PREFIX}${jobId}`,
            600,
            JSON.stringify(resultData)
        );

        await redis.del(`${this.ACTIVE_PREFIX}${jobId}`);

        await redis.hincrby(this.STATS_KEY, 'active', -1);
        await redis.hincrby(this.STATS_KEY, success ? 'completed' : 'failed', 1);

        console.log(`💾 Result stored for job ${jobId} (${success ? 'success' : 'failed'})`);
    }

    async getResult(jobId: string, maxWaitMs: number = 30000): Promise<any> {
        const startTime = Date.now();
        const pollInterval = 500;

        while (Date.now() - startTime < maxWaitMs) {
            const result = await redis.get(`${this.RESULT_PREFIX}${jobId}`);

            if (result) {
                const parsed = JSON.parse(result);
                await redis.del(`${this.RESULT_PREFIX}${jobId}`);
                return parsed;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Job timeout: Result not available');
    }

    async getStats(): Promise<QueueStats> {
        const stats = await redis.hgetall(this.STATS_KEY);

        return {
            waiting: parseInt(stats.waiting || '0'),
            active: parseInt(stats.active || '0'),
            completed: parseInt(stats.completed || '0'),
            failed: parseInt(stats.failed || '0'),
        };
    }

    async getQueueLength(): Promise<number> {
        return await redis.zcard(`${this.QUEUE_PREFIX}${this.queueType}`);
    }

    async checkRateLimit(userEmail: string, maxPerMinute: number = 10): Promise<boolean> {
        const key = `ratelimit:${this.queueType}:${userEmail}`;
        const current = await redis.incr(key);

        if (current === 1) {
            await redis.expire(key, 60);
        }

        return current <= maxPerMinute;
    }

    async cleanup(): Promise<void> {
        const cutoffTime = Date.now() - 3600000;
        const queueKey = `${this.QUEUE_PREFIX}${this.queueType}`;

        await redis.zremrangebyscore(queueKey, '-inf', cutoffTime);

        console.log(`🧹 Cleaned up old jobs from ${this.queueType} queue`);
    }
}

setInterval(async () => {
    const pythonQueue = new QueueManager('python');
    const sqlQueue = new QueueManager('sql');

    await pythonQueue.cleanup();
    await sqlQueue.cleanup();
}, 300000);

export default redis;