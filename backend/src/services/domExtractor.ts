import { chromium, Page } from 'playwright';

/**
 * Helper function to wait for DOM stabilization.
 * Checks element count periodically and considers the DOM stable when count doesn't change.
 */
async function waitForDomStabilization(page: Page, timeoutMs = 10000, checkIntervalMs = 500): Promise<void> {
  const startTime = Date.now();
  let lastCount = 0;
  let stableTime = 0;

  while (Date.now() - startTime < timeoutMs) {
    const currentCount = await page.evaluate(() => document.getElementsByTagName('*').length);
    if (currentCount === lastCount && currentCount > 0) {
      stableTime += checkIntervalMs;
      if (stableTime >= 1500) { // Confirmed stable for 1.5 seconds
        console.log(`DOM stabilized with ${currentCount} elements.`);
        return;
      }
    } else {
      lastCount = currentCount;
      stableTime = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }
  console.warn('DOM stabilization timeout reached; proceeding with current state.');
}

/**
 * Visits a URL, applies advanced wait conditions, and returns page metadata.
 */
export async function extractPageMetadata(url: string): Promise<{ title: string; status: number; elementCount: number }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Navigating to: ${url}`);
    
    // 1. Wait for load state while navigating
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    const status = response?.status() ?? 200;

    // 2. Wait for network connections to settle (networkidle)
    console.log('Waiting for network idle...');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.warn('Network idle timeout reached; continuing...');
    });

    // 3. Wait for all fonts to finish loading
    console.log('Waiting for document fonts to load...');
    await page.evaluate(() => document.fonts.ready).catch((err) => {
      console.warn('Failed waiting for fonts:', err);
    });

    // 4. Wait for DOM size to stabilize
    console.log('Waiting for DOM stabilization...');
    await waitForDomStabilization(page);

    const title = await page.title();
    const elementCount = await page.evaluate(() => document.getElementsByTagName('*').length);

    console.log(`Successfully loaded page: "${title}" | Elements: ${elementCount} | Status: ${status}`);

    return { title, status, elementCount };
  } catch (error) {
    console.error(`Failed during page extraction for ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}
