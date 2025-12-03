import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { DistributionType, ScoreErrorParams } from '../types';
import { getPdf, getScore } from '../utils/math';
import { Sliders, AlertTriangle } from 'lucide-react';

interface ScoreVisProps {
  type: DistributionType;
  sigma: number;
  setSigma: (v: number) => void;
  errorType: 'none' | ScoreErrorParams['type'];
  setErrorType: (v: ScoreErrorParams['type']) => void;
  errorSeverity: number;
  setErrorSeverity: (v: number) => void;
  normalizeArrows: boolean;
}

const ScoreVis: React.FC<ScoreVisProps> = ({
  type,
  sigma,
  setSigma,
  errorType,
  setErrorType,
  errorSeverity,
  setErrorSeverity,
  normalizeArrows
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state removed (lifted to App.tsx)

  // Configuration
  const width = 600;
  const height = 600;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Domain limits
  const xDomain = [-5, 5];
  const yDomain = [-5, 5];

  // Grid resolution
  const densityGridSize = 100; // For contours
  const vectorGridSize = 20;   // For arrows

  // Memoize data calculation 
  const { densityData, vectorData } = useMemo(() => {
    // 1. Calculate Density Field
    const xStep = (xDomain[1] - xDomain[0]) / densityGridSize;
    const yStep = (yDomain[1] - yDomain[0]) / densityGridSize;

    // Flat array of density values for d3-contour
    const values: number[] = new Array(densityGridSize * densityGridSize).fill(0);

    for (let j = 0; j < densityGridSize; j++) {
      for (let i = 0; i < densityGridSize; i++) {
        const x = xDomain[0] + i * xStep;
        const y = yDomain[0] + j * yStep;
        values[j * densityGridSize + i] = getPdf({ x, y }, type, sigma);
      }
    }

    // 2. Calculate Vector Field (Score)
    const vxStep = (xDomain[1] - xDomain[0]) / vectorGridSize;
    const vyStep = (yDomain[1] - yDomain[0]) / vectorGridSize;
    const vectors = [];

    const errParams: ScoreErrorParams = { type: errorType, severity: errorSeverity, stable: true };

    for (let j = 0; j < vectorGridSize; j++) {
      for (let i = 0; i < vectorGridSize; i++) {
        // Center the vector in the grid cell
        const x = xDomain[0] + (i + 0.5) * vxStep;
        const y = yDomain[0] + (j + 0.5) * vyStep;

        // Pass error params to visualization
        const score = getScore({ x, y }, type, sigma, errParams);

        const mag = Math.sqrt(score.x * score.x + score.y * score.y);

        // Visualize:
        // If error is active, we show EVERYTHING to demonstrate the noise in empty regions.
        // Otherwise, clean up the vis by hiding tiny gradients.
        if (mag > 0.05 || errorType !== 'none') {
          vectors.push({ pos: { x, y }, dir: score, mag });
        }
      }
    }

    return { densityData: values, vectorData: vectors };
  }, [type, sigma, errorType, errorSeverity]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    // --- Render Density Contours ---
    const maxDensity = Math.max(...densityData, 0.001);
    const contours = d3.contours()
      .size([densityGridSize, densityGridSize])
      .thresholds(d3.range(0, maxDensity, maxDensity / 12))
      (densityData);

    const densityColorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxDensity]);

    const gridToScreenX = d3.scaleLinear().domain([0, densityGridSize]).range([0, innerWidth]);
    const gridToScreenY = d3.scaleLinear().domain([0, densityGridSize]).range([innerHeight, 0]);

    const path = d3.geoPath(d3.geoTransform({
      point: function (x, y) {
        this.stream.point(gridToScreenX(x), gridToScreenY(y));
      }
    }));

    g.selectAll("path.density")
      .data(contours)
      .enter().append("path")
      .attr("class", "density")
      .attr("d", path)
      .attr("fill", d => densityColorScale(d.value))
      .attr("opacity", 0.6)
      .attr("stroke", "none");

    // --- Render Vector Field (Score) ---
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#374151");

    // Arrow length configuration
    let lenScale: (mag: number) => number;

    if (normalizeArrows) {
      // Normalize all arrows to the same length (showing direction only)
      const arrowLength = 15;
      lenScale = () => arrowLength;
    } else {
      // Dynamic length scale based on magnitude
      const maxMag = Math.max(...vectorData.map(v => v.mag), 0.1);
      const d3Scale = d3.scaleLinear()
        .domain([0, 5])
        .range([0, 25])
        .clamp(true);
      lenScale = (mag: number) => d3Scale(mag);
    }

    const arrows = g.selectAll("g.arrow")
      .data(vectorData)
      .enter().append("g")
      .attr("class", "arrow")
      .attr("transform", d => `translate(${xScale(d.pos.x)}, ${yScale(d.pos.y)})`);

    arrows.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", d => {
        const normX = d.dir.x / d.mag;
        return normX * lenScale(d.mag);
      })
      .attr("y2", d => {
        const normY = d.dir.y / d.mag;
        return -(normY * lenScale(d.mag));
      })
      .attr("stroke", errorType !== 'none' ? "#b91c1c" : "#374151")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)")
      .attr("opacity", normalizeArrows ? 0.7 : d => Math.min(1, d.mag * 0.5 + 0.2));

    // --- Axes ---
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", "#9ca3af");

    g.append("g")
      .call(yAxis)
      .attr("color", "#9ca3af");

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

  }, [densityData, vectorData, innerWidth, innerHeight, errorType, normalizeArrows]);

  return (
    <div ref={containerRef} className="flex justify-center bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default ScoreVis;