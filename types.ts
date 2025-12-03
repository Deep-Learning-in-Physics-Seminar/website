export interface Point {
  x: number;
  y: number;
}

export interface ScoreErrorParams {
  type: 'none' | 'learned_noise' | 'naive';
  severity: number; // 0 to 1
  stable?: boolean; // if true, uses deterministic noise based on position
}

export interface Vector {
  x: number;
  y: number;
}

export enum DistributionType {
  GAUSSIAN = 'Gaussian',
  MIXTURE = 'Mixture of Gaussians',
  RING = 'Ring',
  SWISS_ROLL = 'Swiss Roll (Approx)',
}

export interface DistributionParams {
  type: DistributionType;
}
