import { colord, extend } from 'colord';
import labPlugin from 'colord/plugins/lab';
import { IExtractedElement } from '../types';

extend([labPlugin]);

export interface ILabColor {
  l: number;
  a: number;
  b: number;
}

export interface IColorCluster {
  hex: string;
  count: number;
}

/**
 * Parses any color string (HEX, RGB, RGBA, Named) to Lab color space.
 * Returns null if the color is invalid or fully transparent (alpha = 0).
 */
export function parseToLab(colorStr: string): ILabColor | null {
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

/**
 * Clusters a list of extracted elements' colors and returns the top distilled colors (up to maxColors).
 */
export function clusterColors(elements: IExtractedElement[], maxColors = 15, deThreshold = 5): IColorCluster[] {
  const rawColors: string[] = [];
  const colorProps = ['color', 'background-color', 'border-top-color'];

  // 1. Gather all style colors
  elements.forEach((el) => {
    colorProps.forEach((prop) => {
      const val = el.styles[prop];
      if (val) {
        rawColors.push(val);
      }
    });
  });

  // 2. Map unique colors to Lab values
  const uniqueColorsMap = new Map<string, ILabColor>();
  rawColors.forEach((colorStr) => {
    const c = colord(colorStr);
    if (!c.isValid()) return;
    if (c.alpha() === 0) return; // Ignore fully transparent colors
    
    const hex = c.toHex();
    if (!uniqueColorsMap.has(hex)) {
      const lab = parseToLab(hex);
      if (lab) {
        uniqueColorsMap.set(hex, lab);
      }
    }
  });

  // Count usage of each unique hex color
  const colorCounts = new Map<string, number>();
  rawColors.forEach((colorStr) => {
    const c = colord(colorStr);
    if (c.isValid() && c.alpha() > 0) {
      const hex = c.toHex();
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
  });

  // 3. Perform agglomerative clustering using Delta-E
  interface IClusterInternal {
    lSum: number;
    aSum: number;
    bSum: number;
    members: { hex: string; count: number }[];
    totalCount: number;
  }

  const clusters: IClusterInternal[] = [];

  for (const [hex, lab] of uniqueColorsMap.entries()) {
    const count = colorCounts.get(hex) || 0;
    
    let closestCluster: IClusterInternal | null = null;
    let minDistance = Infinity;

    for (const cluster of clusters) {
      const centroid = {
        l: cluster.lSum / cluster.members.length,
        a: cluster.aSum / cluster.members.length,
        b: cluster.bSum / cluster.members.length,
      };

      const dist = calculateDeltaE(lab, centroid);
      if (dist < minDistance) {
        minDistance = dist;
        closestCluster = cluster;
      }
    }

    if (closestCluster && minDistance < deThreshold) {
      // Add member to existing cluster and update sums
      closestCluster.members.push({ hex, count });
      closestCluster.lSum += lab.l;
      closestCluster.aSum += lab.a;
      closestCluster.bSum += lab.b;
      closestCluster.totalCount += count;
    } else {
      // Initialize new cluster
      clusters.push({
        lSum: lab.l,
        aSum: lab.a,
        bSum: lab.b,
        members: [{ hex, count }],
        totalCount: count,
      });
    }
  }

  // 4. Distill clusters into final HEX colors
  const result: IColorCluster[] = clusters.map((cluster) => {
    const centroidLab = {
      l: cluster.lSum / cluster.members.length,
      a: cluster.aSum / cluster.members.length,
      b: cluster.bSum / cluster.members.length,
    };
    
    const hex = colord(centroidLab).toHex();
    return {
      hex,
      count: cluster.totalCount,
    };
  });

  // 5. Sort by occurrence count descending and return top results
  return result.sort((a, b) => b.count - a.count).slice(0, maxColors);
}
