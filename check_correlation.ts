
import { getScore } from './utils/math';
import { DistributionType } from './types';

const type = DistributionType.GAUSSIAN;
const sigma = 0;

console.log("--- Checking Spatial Correlation of Error Field ---");

const p0 = { x: 0, y: 0 };
const p1 = { x: 0.01, y: 0 }; // Very close point
const p2 = { x: 0.1, y: 0 };  // Close point

const errParams = { type: 'uniform' as const, severity: 1.0, stable: true };

const s0 = getScore(p0, type, sigma, errParams);
const s1 = getScore(p1, type, sigma, errParams);
const s2 = getScore(p2, type, sigma, errParams);

// Calculate error component only (approximate, since score at 0 is 0 for Gaussian)
// Actually Gaussian score at 0 is 0. So s0 is pure error.
// Gaussian score at 0.01 is -0.01. s1 is -0.01 + error.
// Let's just look at the raw values.

console.log(`Point (0, 0):     (${s0.x.toFixed(3)}, ${s0.y.toFixed(3)})`);
console.log(`Point (0.01, 0):  (${s1.x.toFixed(3)}, ${s1.y.toFixed(3)})`);
console.log(`Point (0.1, 0):   (${s2.x.toFixed(3)}, ${s2.y.toFixed(3)})`);

// Check if they are similar (correlated) or wildly different (uncorrelated)
const diff01 = Math.sqrt(Math.pow(s0.x - s1.x, 2) + Math.pow(s0.y - s1.y, 2));
console.log(`\nDistance between Error(0) and Error(0.01): ${diff01.toFixed(3)}`);

if (diff01 > 1.0) {
    console.log("CONCLUSION: Noise is High Frequency (Uncorrelated). This explains why it averages out.");
} else {
    console.log("CONCLUSION: Noise is Low Frequency (Correlated).");
}
