import { colord, extend } from 'colord';
import labPlugin from 'colord/plugins/lab';

extend([labPlugin]);

export interface ILabColor {
  l: number;
  a: number;
  b: number;
}

/**
 * Parses any color string (HEX, RGB, RGBA, Named) to Lab color space.
 * Returns null if the color is invalid or fully transparent (alpha = 0).
 */
export function parseToLab(colorStr: string): ILabColor | null {
  // Normalize strings like 'transparent' or rgba(..., 0)
  if (colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
    return null;
  }
  
  const c = colord(colorStr);
  if (!c.isValid()) return null;
  
  // If color is fully transparent, ignore it
  if (c.alpha() === 0) return null;

  const lab = c.toLab();
  return { l: lab.l, a: lab.a, b: lab.b };
}

/**
 * Calculates CIE76 Delta-E distance between two Lab colors.
 * This represents the perceptual color difference.
 */
export function calculateDeltaE(c1: ILabColor, c2: ILabColor): number {
  const dL = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
