import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import * as d3 from "d3";
import { DistributionType, Point, ScoreErrorParams } from "../types";
import { getPdf, getScore, randomNormal } from "../utils/math";
import {
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Flame,
  AlertTriangle,
} from "lucide-react";

interface LangevinVisProps {
  type: DistributionType;
  sigma: number;
  errorType: ScoreErrorParams["type"];
  errorSeverity: number;
}

const LangevinVis: React.FC<LangevinVisProps> = ({
  type,
  sigma,
  errorType,
  errorSeverity,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // State for controls
  const [sampleCount, setSampleCount] = useState(200);
  // noiseLevel (sigma)
  const [stepSize, setStepSize] = useState(0.05); // epsilon
  const [isRunning, setIsRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);

  // errorType and errorSeverity lifted to props

  // State for particles
  const [particles, setParticles] = useState<Point[]>([]);

  // Configuration
  const width = 600;
  const height = 600;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const xDomain = [-5, 5];
  const yDomain = [-5, 5];
  const densityGridSize = 100;

  // Initialize Particles randomly
  const initializeParticles = useCallback(() => {
    const newParticles = Array.from({ length: sampleCount }).map(() => ({
      // Initialize uniform random in [-5, 5]
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
    }));
    setParticles(newParticles);
    setStepCount(0);
  }, [sampleCount]);

  // Effect to re-initialize when sample count changes
  useEffect(() => {
    initializeParticles();
    setIsRunning(false);
  }, [sampleCount, type, initializeParticles]);

  // Memoize Density Data (Background)
  const densityData = useMemo(() => {
    const xStep = (xDomain[1] - xDomain[0]) / densityGridSize;
    const yStep = (yDomain[1] - yDomain[0]) / densityGridSize;
    const values: number[] = new Array(densityGridSize * densityGridSize).fill(
      0,
    );

    for (let j = 0; j < densityGridSize; j++) {
      for (let i = 0; i < densityGridSize; i++) {
        const x = xDomain[0] + i * xStep;
        const y = yDomain[0] + j * yStep;
        values[j * densityGridSize + i] = getPdf({ x, y }, type, sigma);
      }
    }
    return values;
  }, [type, sigma]);

  // Animation Loop
  useEffect(() => {
    let animationId: number;

    if (isRunning) {
      const update = () => {
        setParticles((currentParticles) => {
          // Error parameters for this step
          // We set stable: false because for sampling, the noise should act like variance (random per step)
          // rather than bias (fixed per position).
          const errParams: ScoreErrorParams = {
            type: errorType,
            severity: errorSeverity,
            stable: true,
          };

          return currentParticles.map((p) => {
            // Langevin Dynamics Step (Algorithm 1)
            // x_{t+1} = x_t + (alpha_i/2) * s(x_t, sigma_i) + sqrt(alpha_i) * z_t

            const score = getScore(p, type, sigma, errParams);

            const zt_x = randomNormal();
            const zt_y = randomNormal();

            // Calculate new position
            let newX =
              p.x + (stepSize / 2) * score.x + Math.sqrt(stepSize) * zt_x;
            let newY =
              p.y + (stepSize / 2) * score.y + Math.sqrt(stepSize) * zt_y;

            // Soft clamping for visualization
            if (newX < -6) newX = -6;
            if (newX > 6) newX = 6;
            if (newY < -6) newY = -6;
            if (newY > 6) newY = 6;

            return { x: newX, y: newY };
          });
        });

        setStepCount((c) => c + 1);
        animationId = requestAnimationFrame(update);
      };

      animationId = requestAnimationFrame(update);
    }

    return () => cancelAnimationFrame(animationId);
  }, [isRunning, type, stepSize, sigma, errorType, errorSeverity]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    // 1. Render Background Density
    const maxDensity = Math.max(...densityData, 0.001);
    const contours = d3
      .contours()
      .size([densityGridSize, densityGridSize])
      .thresholds(d3.range(0, maxDensity, maxDensity / 10))(densityData);

    const densityColorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxDensity]);

    const gridToScreenX = d3
      .scaleLinear()
      .domain([0, densityGridSize])
      .range([0, innerWidth]);
    const gridToScreenY = d3
      .scaleLinear()
      .domain([0, densityGridSize])
      .range([innerHeight, 0]);

    const path = d3.geoPath(
      d3.geoTransform({
        point: function (x, y) {
          this.stream.point(gridToScreenX(x), gridToScreenY(y));
        },
      }),
    );

    g.selectAll("path.density")
      .data(contours)
      .enter()
      .append("path")
      .attr("class", "density")
      .attr("d", path)
      .attr("fill", (d) => densityColorScale(d.value))
      .attr("opacity", 0.4)
      .attr("stroke", "none");

    // 2. Render Particles
    g.selectAll("circle.particle")
      .data(particles)
      .enter()
      .append("circle")
      .attr("class", "particle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 3)
      .attr("fill", errorType !== "none" ? "#ef4444" : "#dc2626")
      .attr("fill-opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5);

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", "#9ca3af");
    g.append("g").call(yAxis).attr("color", "#9ca3af");

    // Add axis labels
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 35)
      .attr("fill", "#6b7280")
      .attr("font-size", "12px")
      .text("x");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(-35, ${innerHeight / 2}) rotate(-90)`)
      .attr("fill", "#6b7280")
      .attr("font-size", "12px")
      .text("y");
  }, [densityData, particles, innerWidth, innerHeight, errorType]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex justify-center overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="max-w-full h-auto"
        />
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-72 bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 h-fit">
        <h3 className="font-semibold text-gray-900 flex items-center border-b pb-3">
          <Settings2 className="w-5 h-5 mr-2" />
          Sampling
        </h3>

        {/* Playback Controls */}
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2 rounded-md transition-colors ${isRunning ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
          >
            {isRunning ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <div className="font-mono text-sm text-gray-600">
            Steps: {stepCount}
          </div>
          <button
            onClick={initializeParticles}
            className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            title="Reset Samples"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Standard Params */}
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500">
            <p>
              Controlled by the <strong>Score Function</strong> settings above.
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Noise (σ):</span>
                <span className="font-mono">{sigma.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Error:</span>
                <span className="font-mono">{errorType}</span>
              </div>
              {errorType !== "none" && (
                <div className="flex justify-between">
                  <span>Severity:</span>
                  <span className="font-mono">{errorSeverity.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Step Size (ε): {stepSize.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.001"
              max="0.2"
              step="0.001"
              value={stepSize}
              onChange={(e) => setStepSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Controls the step size in Langevin dynamics
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Samples: {sampleCount}
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={sampleCount}
              onChange={(e) => setSampleCount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LangevinVis;

