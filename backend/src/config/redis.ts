import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const redisUrlStr = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`Configuring Redis connection options...`);

/**
 * Returns connection options for BullMQ.
 * Parses the REDIS_URL environment variable dynamically.
 */
export function getRedisConnectionOptions(): ConnectionOptions {
  try {
    const url = new URL(redisUrlStr);
    const isTls = url.protocol === 'rediss:';
    
    return {
      host: url.hostname || '127.0.0.1',
      port: url.port ? parseInt(url.port) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      tls: isTls ? {} : undefined,
    } as any;
  } catch (error) {
    console.error(`Failed to parse REDIS_URL "${redisUrlStr}", falling back to localhost:`, error);
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}
