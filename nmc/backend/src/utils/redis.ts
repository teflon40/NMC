import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
    url: redisUrl
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// Ensure we only connect once
let isConnected = false;

export const connectRedis = async () => {
    if (!isConnected) {
        try {
            // Add a 2-second timeout to the initial connection as well
            await Promise.race([
                redisClient.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout")), 2000))
            ]);
            isConnected = true;
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            // We failed to connect. Ensure we don't block subsequent requests indefinitely.
            // By leaving isConnected = false, subsequent getCache calls will retry (and hit their own timeout),
            // or we could set a flag that Redis is permanently down until reboot.
        }
    }
};

// Helper to get JSON
export const getCache = async <T>(_key: string): Promise<T | null> => {
    return null; // Temporarily Disabled due to Redis connection issues
};

// Helper to set JSON
export const setCache = async (_key: string, _value: any, _ttlSeconds: number = 3600) => {
    return; // Temporarily Disabled
};

// Helper to clear JSON
export const clearCache = async (_key: string) => {
    return; // Temporarily Disabled
};
