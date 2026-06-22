import { chromium } from 'playwright';

/**
 * Basic extraction service using Playwright.
 * Visits a URL and returns basic metadata to verify setup.
 */
export async function extractPageMetadata(url: string): Promise<{ title: string; status: number }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log(`Navigating to: ${url}`);
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    
    const title = await page.title();
    const status = response?.status() ?? 200;
    
    console.log(`Successfully loaded page: "${title}" (Status: ${status})`);
    
    return { title, status };
  } catch (error) {
    console.error(`Failed to navigate to ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}
