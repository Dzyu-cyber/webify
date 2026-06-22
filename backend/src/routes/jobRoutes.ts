import { Router, Request, Response } from 'express';
import { extractionQueue } from '../queues/extractionQueue';
import { Job } from 'bullmq';

const router = Router();

// Basic regex for URL validation
function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * POST /api/extract
 * Submits a URL for style extraction.
 */
router.post('/extract', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'A valid http/https URL must be provided.' });
  }

  try {
    // Add job to the extraction queue
    const job = await extractionQueue.add('extract', { url });
    console.log(`Pushed job ${job.id} to extraction-queue for URL: ${url}`);
    
    return res.status(202).json({
      success: true,
      jobId: job.id,
    });
  } catch (error) {
    console.error('Failed to submit job to queue:', error);
    return res.status(500).json({ error: 'Failed to queue the extraction job.' });
  }
});

/**
 * GET /api/jobs/:id
 * Retrieves the status and results of a style extraction job.
 */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const job = await Job.fromId(extractionQueue, id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const state = await job.getState();
    const progress = job.progress;

    let responseData: Record<string, any> = {
      id: job.id,
      state,
      progress,
    };

    if (state === 'completed') {
      responseData.result = job.returnvalue;
    } else if (state === 'failed') {
      responseData.failedReason = job.failedReason;
    }

    return res.json(responseData);
  } catch (error) {
    console.error(`Failed to fetch job status for ${id}:`, error);
    return res.status(500).json({ error: 'Failed to retrieve job status.' });
  }
});

export default router;
