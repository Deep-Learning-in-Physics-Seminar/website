// Learned with noise perturbations (weights/)
import gaussianWeights from '../weights/weights_gaussian.json';
import mixtureWeights from '../weights/weights_mixture.json';
import ringWeights from '../weights/weights_ring.json';
import swissRollWeights from '../weights/weights_swiss_roll.json';

// Naive approach (weights2/)
import gaussianWeights2 from '../weights2/weights_gaussian.json';
import mixtureWeights2 from '../weights2/weights_mixture.json';
import ringWeights2 from '../weights2/weights_ring.json';
import swissRollWeights2 from '../weights2/weights_swiss_roll.json';

import { DistributionType } from '../types';

// Type definition for a single layer's weights and bias
interface LayerWeights {
    weight: number[][]; // [out_features, in_features]
    bias: number[];     // [out_features]
}

// The model consists of a sequence of layers
type ModelWeights = LayerWeights[];

// Map for learned scores with noise perturbations (weights/)
const WEIGHTS_LEARNED_NOISE: Record<DistributionType, ModelWeights> = {
    'Gaussian': gaussianWeights as ModelWeights,
    'Mixture of Gaussians': mixtureWeights as ModelWeights,
    'Ring': ringWeights as ModelWeights,
    'Swiss Roll (Approx)': swissRollWeights as ModelWeights,
};

// Map for naive approach (weights2/)
const WEIGHTS_NAIVE: Record<DistributionType, ModelWeights> = {
    'Gaussian': gaussianWeights2 as ModelWeights,
    'Mixture of Gaussians': mixtureWeights2 as ModelWeights,
    'Ring': ringWeights2 as ModelWeights,
    'Swiss Roll (Approx)': swissRollWeights2 as ModelWeights,
};

// Softplus activation function: ln(1 + e^x)
const softplus = (x: number): number => {
    // Numerical stability for large x
    if (x > 20) return x;
    return Math.log(1 + Math.exp(x));
};

// Matrix multiplication: y = Wx + b
const linearLayer = (input: number[], layer: LayerWeights): number[] => {
    const { weight, bias } = layer;
    const outFeatures = weight.length;
    const inFeatures = weight[0].length;
    const output = new Array(outFeatures).fill(0);

    for (let i = 0; i < outFeatures; i++) {
        let sum = bias[i];
        for (let j = 0; j < inFeatures; j++) {
            sum += weight[i][j] * input[j];
        }
        output[i] = sum;
    }
    return output;
};

// Forward pass through the network
// Architecture: Linear(2, 128) -> Softplus -> Linear(128, 128) -> Softplus -> Linear(128, 128) -> Softplus -> Linear(128, 2)
export const getLearnedScore = (
    x: number,
    y: number,
    type: DistributionType,
    useNaive: boolean = false
): { x: number, y: number } => {
    const weightsMap = useNaive ? WEIGHTS_NAIVE : WEIGHTS_LEARNED_NOISE;
    const weights = weightsMap[type];
    if (!weights) {
        console.warn(`No weights found for distribution type: ${type}`);
        return { x: 0, y: 0 };
    }

    let currentActivation = [x, y];

    // Iterate through layers
    // The weights file contains 4 layers.
    // Layers 0, 1, 2 are followed by Softplus.
    // Layer 3 is the output layer (no activation).

    for (let i = 0; i < weights.length; i++) {
        // Linear pass
        currentActivation = linearLayer(currentActivation, weights[i]);

        // Apply activation for all but the last layer
        if (i < weights.length - 1) {
            currentActivation = currentActivation.map(softplus);
        }
    }

    return { x: currentActivation[0], y: currentActivation[1] };
};
