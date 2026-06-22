import { IExtractedElement, IDistilledDesignTokens } from '../types';
import { clusterColors } from './colorDistiller';

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

  // Filter to keep only values that are significant
  // If we have few total spacing values (less than 10), we keep all unique values >= 4px.
  // Otherwise, we filter to keep values that appear at least 2 times.
  const significantSpacings = Object.entries(frequencies)
    .map(([val, count]) => ({ val: parseInt(val), count }))
    .filter((item) => item.val >= 4 && (spacingValues.length < 10 || item.count >= 2))
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

export interface IDistilledTypography {
  fontFamilies: { name: string; count: number }[];
  fontSizes: string[];
}

// Standard design system font scale values in pixels
const STANDARD_FONT_SIZES = new Set([
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 26, 28, 30, 32, 36, 40, 48, 56, 64, 72, 80, 96
]);

/**
 * Extracts and distills font families and font sizes into a standardized type scale.
 */
export function distillTypography(elements: IExtractedElement[]): IDistilledTypography {
  const families: Record<string, number> = {};
  const sizes: Record<number, number> = {};

  elements.forEach((el) => {
    const family = el.styles['font-family'];
    const size = el.styles['font-size'];

    if (family) {
      const cleanFamily = family
        .split(',')
        .map((f) => f.trim().replace(/['"]/g, ''))
        .join(', ');
      families[cleanFamily] = (families[cleanFamily] || 0) + 1;
    }

    if (size) {
      const parsedSize = parseSpacingValue(size);
      if (parsedSize !== null && parsedSize > 0) {
        sizes[parsedSize] = (sizes[parsedSize] || 0) + 1;
      }
    }
  });

  // Sort font families by usage count descending (limit to top 5)
  const sortedFamilies = Object.entries(families)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Group unique sizes and filter out single-occurrence outliers that don't match the standard font scale
  const uniqueSizes = Object.entries(sizes)
    .map(([size, count]) => ({ size: parseInt(size), count }));

  const filteredSizes = uniqueSizes.filter((item) => {
    // Keep size if it appears multiple times
    if (item.count >= 2) return true;
    // Keep size if it's a standard design system font size (keeps headers/captions used once)
    return STANDARD_FONT_SIZES.has(item.size);
  });

  // Sort font-sizes in ascending order to represent a natural type scale
  const sortedSizesStr = filteredSizes
    .map(item => item.size)
    .sort((a, b) => a - b)
    .map(size => `${size}px`);

  return {
    fontFamilies: sortedFamilies,
    fontSizes: sortedSizesStr,
  };
}

/**
 * Compiles colors, spacing, and typography from raw elements into a structured IDistilledDesignTokens object.
 */
export function distillDesignTokens(elements: IExtractedElement[]): IDistilledDesignTokens {
  const colors = clusterColors(elements);
  const baseSpacing = extractBaseSpacingUnit(elements);
  const typography = distillTypography(elements);

  return {
    colors,
    baseSpacing,
    typography,
  };
}
