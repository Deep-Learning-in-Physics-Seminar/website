import { DistributionType, Point, ScoreErrorParams, Vector } from '../types';
import { getLearnedScore } from './neuralNet';

// Constants
const TWO_PI = 2 * Math.PI;

interface Gaussian {
  mu: Point;
  sigma: number; // Base sigma of the data distribution
  weight: number;
}

export interface ScoreErrorParams {
  type: 'none' | 'uniform' | 'density';
  severity: number;
  stable?: boolean; // If true, uses position-based hashing for stable noise (vis). If false, random (sampling).
}

// Smooth noise function (sum of sines) for spatially correlated error
function getSmoothNoise(x: number, y: number, seed: number): number {
  // Superposition of sine waves for smooth, spatially correlated noise
  // Frequencies: 3, 6, 12 (Higher frequency for more local minima)
  const val1 = Math.sin(x * 3.0 + seed) * Math.cos(y * 3.0 + seed * 1.5);
  const val2 = Math.sin(x * 6.0 + seed * 2) * Math.cos(y * 6.0 + seed * 2.5) * 0.5;
  const val3 = Math.sin(x * 12.0 + seed * 3) * Math.cos(y * 12.0 + seed * 3.5) * 0.25;

  // Normalize roughly to [-1, 1] range (1 + 0.5 + 0.25 = 1.75 max amplitude)
  return (val1 + val2 + val3) / 1.75;
}

// Pseudo-random function for stable noise in visualizations
// Returns a deterministic number between -1 and 1 based on x, y inputs
function pseudoRandom(x: number, y: number, seed: number = 0): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1; // Map to [-1, 1]
}

// Helper: Probability Density of a single 2D Gaussian
// We add 'noiseStd' to the variance to simulate the perturbed data distribution q_sigma(x)
function gaussianPdf(p: Point, g: Gaussian, noiseStd: number = 0): number {
  const dx = p.x - g.mu.x;
  const dy = p.y - g.mu.y;
  // variance = sigma_data^2 + sigma_noise^2
  const variance = g.sigma * g.sigma + noiseStd * noiseStd;
  const exponent = -(dx * dx + dy * dy) / (2 * variance);
  return (1 / (TWO_PI * variance)) * Math.exp(exponent);
}

// Helper: Score of a single 2D Gaussian
// ∇_x log p(x) = -Σ^-1 (x - μ)
function gaussianScore(p: Point, g: Gaussian, noiseStd: number = 0): Vector {
  const variance = g.sigma * g.sigma + noiseStd * noiseStd;
  return {
    x: -(p.x - g.mu.x) / variance,
    y: -(p.y - g.mu.y) / variance,
  };
}

// Distribution Definitions
const distributions: Record<string, Gaussian[]> = {
  [DistributionType.GAUSSIAN]: [
    { mu: { x: 0, y: 0 }, sigma: 1.0, weight: 1 }
  ],
  [DistributionType.MIXTURE]: [
    { mu: { x: -2.5, y: -2.5 }, sigma: 0.8, weight: 0.5 },
    { mu: { x: 2.5, y: 2.5 }, sigma: 0.8, weight: 0.5 },
  ],
  [DistributionType.RING]: Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * TWO_PI;
    const radius = 3.5;
    return {
      mu: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
      sigma: 0.5,
      weight: 1 / 8,
    };
  }),
  [DistributionType.SWISS_ROLL]: Array.from({ length: 15 }).map((_, i) => {
    // Very rough approx of a spiral using Gaussians
    const t = 1.5 * Math.PI * (1 + 2 * i / 15);
    const r = 0.5 + 0.3 * t; // radius grows
    const x = r * Math.cos(t) * 0.4;
    const y = r * Math.sin(t) * 0.4;
    return {
      mu: { x, y },
      sigma: 0.35,
      weight: 1 / 15
    }
  })
};

export function getPdf(p: Point, type: DistributionType, noiseStd: number = 0): number {
  const components = distributions[type];
  if (!components) return 0;

  let totalPdf = 0;
  for (const comp of components) {
    totalPdf += comp.weight * gaussianPdf(p, comp, noiseStd);
  }
  return totalPdf;
}

export function getScore(
  p: Point,
  type: DistributionType,
  noiseStd: number = 0,
  errorParams: ScoreErrorParams = { type: 'none', severity: 0 }
): Vector {
  const components = distributions[type];
  if (!components) return { x: 0, y: 0 };

  const totalP = getPdf(p, type, noiseStd);

  // Calculate True Analytic Score
  let scoreX = 0;
  let scoreY = 0;

  if (totalP > 1e-12) {
    let sumSx = 0;
    let sumSy = 0;

    for (const comp of components) {
      const prob = gaussianPdf(p, comp, noiseStd);
      const score = gaussianScore(p, comp, noiseStd);
      const w = comp.weight * prob;

      sumSx += w * score.x;
      sumSy += w * score.y;
    }
    scoreX = sumSx / totalP;
    scoreY = sumSy / totalP;
  }

  // Apply Learned Score with Noise Perturbations
  if (errorParams.type === 'learned_noise') {
    const learned = getLearnedScore(p.x, p.y, type, false);
    return { x: learned.x, y: learned.y };
  }

  // Apply Naive Learned Score
  if (errorParams.type === 'naive') {
    const learned = getLearnedScore(p.x, p.y, type, true);
    return { x: learned.x, y: learned.y };
  }

  return { x: scoreX, y: scoreY };
}

export function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}