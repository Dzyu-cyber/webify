import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from './config/redis';
import { extractComputedStyles } from './services/domExtractor';
import { distillDesignTokens } from './services/styleDistiller';
import { generateDesignMarkdown } from './services/claudeService';

const connection = getRedisConnectionOptions();

console.log('BullMQ style-extraction worker starting...');

const worker = new Worker(
  'extraction-queue',
  async (job: Job) => {
    const { url } = job.data;
    console.log(`Processing job ${job.id} for URL: ${url}`);

    try {
      // Step 1: Headless extraction
      await job.updateProgress(10);
      console.log(`Job ${job.id} [10%]: Extracting computed styles via Playwright...`);
      const extracted = await extractComputedStyles(url);

      // Step 2: Distill design system tokens
      await job.updateProgress(45);
      console.log(`Job ${job.id} [45%]: Distilling design tokens (colors, grid, type)...`);
      const tokens = distillDesignTokens(extracted.elements);

      // Step 3: LLM Formatting
      await job.updateProgress(75);
      console.log(`Job ${job.id} [75%]: Requesting Claude API formatting...`);
      const markdown = await generateDesignMarkdown(extracted.title, tokens, extracted.elements, extracted.screenshots);

      // Complete
      await job.updateProgress(100);
      console.log(`Job ${job.id} [100%]: Completed successfully.`);
      return {
        markdown,
        screenshots: extracted.screenshots,
      };
    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);
      throw new Error(error.message || 'Job execution encountered an unhandled error.');
    }
  },
  {
    connection,
    concurrency: 1, // Restrict concurrency to 1 to manage headless browser instance overhead
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed to process:`, err.message);
});
