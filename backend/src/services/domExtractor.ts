import { chromium, Page } from 'playwright';
import { IExtractedElement } from '../types';

const PROPERTIES_TO_COLLECT = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'display',
  'position',
  'border-top-color',
  'border-radius',
  'box-shadow'
];

/**
 * Extracts default browser styles for common tags on a blank page.
 */
async function extractBaselineStyles(page: Page, properties: string[]): Promise<Record<string, Record<string, string>>> {
  console.log('Extracting browser baseline user-agent styles...');
  return await page.evaluate((props) => {
    const tags = ['html', 'body', 'div', 'span', 'p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'input', 'ul', 'ol', 'li'];
    const baseline: Record<string, Record<string, string>> = {};

    tags.forEach((tag) => {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      const style = window.getComputedStyle(el);
      const styleMap: Record<string, string> = {};
      props.forEach((prop) => {
        styleMap[prop] = style.getPropertyValue(prop);
      });
      baseline[tag] = styleMap;
      document.body.removeChild(el);
    });

    return baseline;
  }, properties);
}

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
 * Helper function to detect and completely strip iframe elements from the DOM.
 */
async function stripIframes(page: Page): Promise<number> {
  const removedCount = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => iframe.remove());
    return iframes.length;
  });
  console.log(`Detected and stripped ${removedCount} iframe(s) from the page DOM.`);
  return removedCount;
}

/**
 * Visits a URL, waits for it to stabilize, strips iframes, and extracts computed styles for up to 1000 elements,
 * filtering out default browser styles based on a dynamically generated baseline.
 */
export async function extractComputedStyles(
  url: string
): Promise<{
  title: string;
  status: number;
  elements: IExtractedElement[];
  strippedIframes: number;
}> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Gather baseline browser styles before navigation
    const baselineStyles = await extractBaselineStyles(page, PROPERTIES_TO_COLLECT);

    console.log(`Navigating to: ${url}`);
    
    // 2. Navigate and wait for initial load
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    const status = response?.status() ?? 200;

    // 3. Wait for network connections to settle (networkidle)
    console.log('Waiting for network idle...');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.warn('Network idle timeout reached; continuing...');
    });

    // 4. Wait for all fonts to finish loading
    console.log('Waiting for document fonts to load...');
    await page.evaluate(() => document.fonts.ready).catch((err) => {
      console.warn('Failed waiting for fonts:', err);
    });

    // 5. Wait for DOM size to stabilize
    console.log('Waiting for DOM stabilization...');
    await waitForDomStabilization(page);

    // 6. Strip all iframe elements
    console.log('Stripping iframes...');
    const strippedIframes = await stripIframes(page);

    const title = await page.title();

    // 7. Execute DOM injection to gather computed styles for up to 1000 visible elements
    console.log('Running style extraction script...');
    const rawElements = await page.evaluate((props) => {
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Filter for elements that are likely visible and render content
      const visibleElements = allElements.filter((el) => {
        const rect = el.getBoundingClientRect();
        // Check if element has area and display style isn't 'none'
        if (rect.width <= 0 || rect.height <= 0) return false;
        
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        
        return true;
      });

      // Sample first 1000 visible elements
      const sampled = visibleElements.slice(0, 1000);

      return sampled.map((el) => {
        const style = window.getComputedStyle(el);
        const styleMap: Record<string, string> = {};
        props.forEach((prop) => {
          styleMap[prop] = style.getPropertyValue(prop);
        });

        return {
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          id: el.id,
          styles: styleMap,
        };
      });
    }, PROPERTIES_TO_COLLECT);

    // 8. Filter out default user-agent styles dynamically
    console.log('Filtering out baseline browser styles...');
    const elements: IExtractedElement[] = rawElements.map((el) => {
      // Find the baseline config for this tag, default to 'div' if tag isn't explicitly pre-mapped
      const baseline = baselineStyles[el.tagName] || baselineStyles['div'] || {};
      
      const filteredStyles: Record<string, string> = {};
      Object.entries(el.styles).forEach(([prop, val]) => {
        // Only keep style property if it differs from the browser's default baseline value
        if (val !== baseline[prop]) {
          filteredStyles[prop] = val;
        }
      });

      return {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        styles: filteredStyles,
      };
    });

    console.log(`Successfully completed extraction for "${title}". Extracted ${elements.length} elements.`);

    return {
      title,
      status,
      elements,
      strippedIframes,
    };
  } catch (error) {
    console.error(`Failed during computed style extraction for ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}
