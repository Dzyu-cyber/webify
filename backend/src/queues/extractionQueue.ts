import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';

const connection = getRedisConnectionOptions();

// Create the BullMQ job queue for style extraction
export const extractionQueue = new Queue('extraction-queue', {
  connection,
});
