import React, { useState } from "react";
import ScoreVis from "./components/ScoreVis";
import LangevinVis from "./components/LangevinVis";
import { DistributionType } from "./types";
import {
  Menu,
  Info,
  Sigma,
  MousePointer2,
  Waves,
  Sliders,
  AlertTriangle,
  ChevronDown,
  Settings2,
} from "lucide-react";

import { ScoreErrorParams } from "./utils/math";

const App: React.FC = () => {
  const [distributionType, setDistributionType] = useState<DistributionType>(
    DistributionType.MIXTURE,
  );

  // Lifted State
  const [sigma, setSigma] = useState(0);
  const [errorType, setErrorType] = useState<ScoreErrorParams["type"]>("none");
  const [errorSeverity, setErrorSeverity] = useState(0.001);

  // Toggle state for sidebar sections
  const [showNoiseLevel, setShowNoiseLevel] = useState(false);
  const [showEstimationError, setShowEstimationError] = useState(false);

  // Visualization options
  const [normalizeArrows, setNormalizeArrows] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sigma className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Score-Based Generative Modeling
            </h1>
          </div>
          {/* <a href="https://yang-song.net/blog/2021/score/" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Read the Paper/Blog &rarr;
          </a> */}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Controls */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Menu className="w-5 h-5 mr-2 text-gray-500" />
                Select Distribution
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose a data distribution <i>p(x)</i> to visualize its score
                function and sample from it.
              </p>

              <div className="space-y-3">
                {Object.values(DistributionType).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDistributionType(type)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                      distributionType === type
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium ring-1 ring-indigo-200"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {/* NCSN Section */}
              <div className="bg-blue-50 rounded-lg border border-blue-100 my-4">
                <button
                  onClick={() => setShowNoiseLevel(!showNoiseLevel)}
                  className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors rounded-lg"
                >
                  <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                    <Sliders className="w-4 h-4 mr-2" />
                    Noise Level (σ)
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-blue-900 transition-transform ${showNoiseLevel ? "rotate-180" : ""}`}
                  />
                </button>
                {showNoiseLevel && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-blue-700 mb-4">
                      Increase σ to fill low-density regions with gradients.
                    </p>
                    <div className="flex flex-col space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={sigma}
                        onChange={(e) => setSigma(Number(e.target.value))}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="text-center font-mono text-sm font-medium text-blue-900">
                        σ = {sigma.toFixed(1)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Estimation Method Section */}
              <div className="bg-purple-50 rounded-lg border border-purple-100">
                <button
                  onClick={() => setShowEstimationError(!showEstimationError)}
                  className="w-full p-4 flex items-center justify-between hover:bg-purple-100 transition-colors rounded-lg"
                >
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Score Estimation Method
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-900 transition-transform ${showEstimationError ? "rotate-180" : ""}`}
                  />
                </button>
                {showEstimationError && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-purple-800 mb-3">
                      Choose how the score function is estimated.
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <label className="flex items-center text-xs text-purple-900">
                          <input
                            type="radio"
                            name="errType"
                            checked={errorType === "none"}
                            onChange={() => setErrorType("none")}
                            className="mr-2"
                          />
                          Perfect Score
                        </label>
                        <label className="flex items-center text-xs text-purple-900 cursor-pointer">
                          <input
                            type="radio"
                            name="errType"
                            checked={errorType === "naive"}
                            onChange={() => setErrorType("naive")}
                            className="mr-2"
                          />
                          Naive
                        </label>
                        <label className="flex items-center text-xs text-purple-900">
                          <input
                            type="radio"
                            name="errType"
                            checked={errorType === "learned_noise"}
                            onChange={() => setErrorType("learned_noise")}
                            className="mr-2"
                          />
                          Learned w/ Noise
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Visualization Options */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Display Options
                </h3>
                <label className="flex items-center text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizeArrows}
                    onChange={(e) => setNormalizeArrows(e.target.checked)}
                    className="mr-2"
                  />
                  Normalize Arrow Lengths
                </label>
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          <div className="lg:col-span-9 space-y-10">
            {/* DEMO 1: Score Visualization */}
            <section>
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <MousePointer2 className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    1. The Score Function
                  </h2>
                  <p className="text-gray-500">
                    Visualizing the gradient of the log-density field.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-xl flex justify-between">
                  <span className="text-xs font-mono font-medium text-gray-500 uppercase tracking-wide">
                    Visualization
                  </span>
                  <span className="text-xs font-mono bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                    {distributionType}
                  </span>
                </div>
                <div className="p-4 flex justify-center">
                  <ScoreVis
                    type={distributionType}
                    sigma={sigma}
                    setSigma={setSigma}
                    errorType={errorType}
                    setErrorType={setErrorType}
                    errorSeverity={errorSeverity}
                    setErrorSeverity={setErrorSeverity}
                    normalizeArrows={normalizeArrows}
                  />
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs">
                  <div className="font-mono space-y-2">
                    <div>
                      <span className="font-semibold text-gray-700">
                        Score Function:
                      </span>
                      <div className="mt-1 text-gray-600">
                        ∇<sub>x</sub> log p<sub>σ</sub>(x)
                      </div>
                    </div>
                    {sigma > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          Perturbed Distribution:
                        </span>
                        <div className="mt-1 text-gray-600">
                          p<sub>σ</sub>(x) = ∫ p(y) 𝒩(x; y, σ²I) dy
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-gray-700">
                        Distribution PDF:
                      </span>
                      <div className="mt-1 text-gray-600">
                        {distributionType === "Gaussian" && "p(x) = 𝒩(x; μ, Σ)"}
                        {distributionType === "Mixture of Gaussians" &&
                          "p(x) = Σ wᵢ 𝒩(x; μᵢ, Σᵢ)"}
                        {distributionType === "Ring" &&
                          "p(x) = (1/8) Σᵢ₌₁⁸ 𝒩(x; μᵢ, Σ) (ring of 8 modes)"}
                        {distributionType === "Swiss Roll (Approx)" &&
                          "p(x) = (1/15) Σᵢ₌₁¹⁵ 𝒩(x; μᵢ, Σ) (spiral of 15 modes)"}
                      </div>
                    </div>
                    {errorType === "density" && (
                      <div>
                        <span className="font-semibold text-gray-700">
                          With Estimation Error:
                        </span>
                        <div className="mt-1 text-gray-600">
                          ∇<sub>x</sub> log p(x) + noise / (p(x) + ε)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* DEMO 2: Langevin Dynamics */}
            <section className="border-t border-gray-200 pt-10">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <Waves className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    2. Langevin Dynamics Sampling
                  </h2>
                  <p className="text-gray-500">
                    Generating samples from noise using only the score function.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-xl flex justify-between">
                  <span className="text-xs font-mono font-medium text-gray-500 uppercase tracking-wide">
                    Simulation
                  </span>
                </div>
                <div className="p-6">
                  <LangevinVis
                    type={distributionType}
                    sigma={sigma}
                    errorType={errorType}
                    errorSeverity={errorSeverity}
                  />
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs">
                  <div className="font-mono space-y-2">
                    <div>
                      <span className="font-semibold text-gray-700">
                        Langevin Dynamics Update:
                      </span>
                      <div className="mt-1 text-gray-600">
                        x<sub>i+1</sub> ← x<sub>i</sub> + ε∇<sub>x</sub> log p
                        <sub>σ</sub>(x<sub>i</sub>) + √(2ε) z<sub>i</sub>
                      </div>
                      <div className="mt-1 text-gray-500 text-[10px]">
                        where z<sub>i</sub> ~ 𝒩(0, I), i = 0,1,...,K
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Current Parameters:
                      </span>
                      <div className="mt-1 text-gray-600">
                        ε = {errorType === "density" ? "varies" : "step size"},
                        σ = {sigma.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

