export function Sparkline({
  values,
  width = 100,
  height = 28,
  color = "var(--blue)",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const points = values.filter((v) => v > 0);
  if (points.length < 2) {
    return <span className="hint">not enough points</span>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 2.2 : 1.4} fill={color} />
      ))}
    </svg>
  );
}
