import { getScore, randomNormal } from './utils/math.ts';
import { DistributionType, Point, ScoreErrorParams } from './types.ts';

const type = DistributionType.GAUSSIAN; // Mean at 0,0
const sigma = 0;
const stepSize = 0.05;
const steps = 1000;

function simulate(stable: boolean, label: string) {
    let p = { x: 2, y: 2 }; // Start away from center
    const errParams: ScoreErrorParams = { type: 'none', severity: 0.1, stable: true };

    let sumDist = 0;

    for (let i = 0; i < steps; i++) {
        const score = getScore(p, type, sigma, errParams);

        // Langevin step
        const zt_x = randomNormal();
        const zt_y = randomNormal();

        p.x = p.x + (stepSize / 2) * score.x + Math.sqrt(stepSize) * zt_x;
        p.y = p.y + (stepSize / 2) * score.y + Math.sqrt(stepSize) * zt_y;

        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        sumDist += dist;
    }

    const finalDist = Math.sqrt(p.x * p.x + p.y * p.y);
    const avgDist = sumDist / steps;

    console.log(`\n--- ${label} (Stable: ${stable}) ---`);
    console.log(`Final Pos: (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`);
    console.log(`Final Dist from Mean: ${finalDist.toFixed(3)}`);
    console.log(`Avg Dist from Mean: ${avgDist.toFixed(3)}`);
}

console.log("Simulating Langevin Dynamics with Error...");
// 1. Stable = false (Current implementation - Random noise per step)
simulate(false, "Time-Dependent Noise");

// 2. Stable = true (Proposed fix - Fixed noise field)
simulate(true, "Fixed Noise Field");
