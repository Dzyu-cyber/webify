import { IExtractedElement } from '../types';

/**
 * Calculates the Greatest Common Divisor of two numbers.
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculates the GCD of an array of numbers.
 */
function calculateArrayGcd(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((acc, val) => gcd(acc, val), numbers[0]);
}

/**
 * Parses a CSS spacing string (e.g., '16px', '1.5rem') to a pixel number.
 * Returns null if parsing is not possible or returns relative percentages.
 */
export function parseSpacingValue(val: string): number | null {
  if (!val || val === '0px' || val === '0') return null;

  // Handle px values
  if (val.endsWith('px')) {
    const num = parseFloat(val);
    return isNaN(num) ? null : Math.round(num);
  }

  // Handle rem/em values (assuming 16px root font size)
  if (val.endsWith('rem') || val.endsWith('em')) {
    const num = parseFloat(val);
    return isNaN(num) ? null : Math.round(num * 16);
  }

  return null;
}

/**
 * Extracts and calculates the base spacing unit (GCD) from margins and paddings.
 * Returns the detected spacing unit (e.g., 4 or 8), defaulting to 8 if not detectable.
 */
export function extractBaseSpacingUnit(elements: IExtractedElement[]): number {
  const spacingProps = [
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
  ];

  const spacingValues: number[] = [];

  elements.forEach((el) => {
    spacingProps.forEach((prop) => {
      const val = el.styles[prop];
      if (val) {
        const parsed = parseSpacingValue(val);
        if (parsed !== null && parsed > 0) {
          spacingValues.push(parsed);
        }
      }
    });
  });

  if (spacingValues.length === 0) return 8; // Default fallback

  // Count frequencies of spacing values
  const frequencies: Record<number, number> = {};
  spacingValues.forEach((val) => {
    frequencies[val] = (frequencies[val] || 0) + 1;
  });

  // Filter to keep only values that are significant (appear at least 2 times)
  // and are greater than or equal to 4px (to ignore border-width offsets, etc.)
  const significantSpacings = Object.entries(frequencies)
    .map(([val, count]) => ({ val: parseInt(val), count }))
    .filter((item) => item.val >= 4 && item.count >= 2)
    .sort((a, b) => b.count - a.count);

  if (significantSpacings.length === 0) {
    // Look at absolute minimum spacing value >= 4px
    const minSpacing = Math.min(...spacingValues.filter(v => v >= 4));
    return isFinite(minSpacing) ? minSpacing : 8;
  }

  // Take the top spacing values (up to 5) to compute GCD
  const topSpacings = significantSpacings.slice(0, 5).map(item => item.val);

  // Compute GCD of top spacing values
  const detectedGcd = calculateArrayGcd(topSpacings);

  // If detected GCD is too small (e.g., less than 4), fall back to standard grid units
  if (detectedGcd < 4) {
    const mostCommon = significantSpacings[0].val;
    if (mostCommon % 8 === 0) return 8;
    if (mostCommon % 4 === 0) return 4;
    return mostCommon; // Fall back to most common value directly
  }

  return detectedGcd;
}
