/**
 * Minimal dependency-free SVG sparkline for the adoption trend.
 * Renders an area + line over the given numeric series. Kept tiny on purpose —
 * a chart library is overkill for the demo's single trend.
 */
export function Sparkline({
  values,
  width = 480,
  height = 80,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) {
    return <p className="text-sm text-slate-400">No data yet.</p>;
  }

  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = values.length > 1 ? i * stepX : width / 2;
    const y = height - (v / max) * (height - 8) - 4;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath =
    lastPoint && firstPoint
      ? `${linePath} L${lastPoint.x.toFixed(1)},${height} L${firstPoint.x.toFixed(1)},${height} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Adoption trend"
    >
      <path d={areaPath} fill="rgb(16 185 129 / 0.12)" />
      <path
        d={linePath}
        fill="none"
        stroke="rgb(16 185 129)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
