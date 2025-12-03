import { getScore } from './utils/math.ts';
import { ScoreErrorParams, DistributionType } from './types.ts';

const pLow = { x: 0, y: 0 };
const pHigh = { x: -2.5, y: -2.5 };
const type = DistributionType.MIXTURE;
const sigma = 0;

console.log("--- Testing getScore ---");

// 1. None
console.log("Done. Error: None");
const s1 = getScore(pLow, type, sigma, { type: 'none', severity: 0.5 });
console.log("Low Density Point:", s1);

// 2. None, Sev 0.5
console.log("\n2. Error: None, Severity 0.5");
const s2 = getScore(pLow, type, sigma, { type: 'none', severity: 0.5, stable: true });
console.log("Low Density Point:", s2);

// 3. Density, Sev 0.5
console.log("\n3. Error: Density, Severity 0.5");
const s3 = getScore(pLow, type, sigma, { type: 'density', severity: 0.5, stable: true });
console.log("Low Density Point:", s3);

// 4. Uniform, Sev 2.0
console.log("\n4. Error: Uniform, Severity 2.0");
const s4 = getScore(pLow, type, sigma, { type: 'none', severity: 2.0, stable: true });
console.log("Low Density Point:", s4);

// 5. Density, Sev 2.0
console.log("\n5. Error: Density, Severity 2.0");
const s5 = getScore(pLow, type, sigma, { type: 'density', severity: 2.0, stable: true });
console.log("Low Density Point:", s5);

// Check High Density Point
console.log("\n--- High Density Point (-2.5, -2.5) ---");
const h1 = getScore(pHigh, type, sigma, { type: 'none', severity: 0.5, stable: true });
console.log("Uniform (0.5):", h1);
const h2 = getScore(pHigh, type, sigma, { type: 'density', severity: 0.5, stable: true });
console.log("Density (0.5):", h2);
