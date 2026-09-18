'use client';

export interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({ data, height = 120 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex w-full items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              key={String(i)}
              title={`${d.label}: ${d.value}`}
              className="w-full rounded-t-md bg-primary transition-all"
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="hidden text-[10px] text-muted-foreground xs:block sm:block">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({
  data,
  width = 280,
  height = 120,
  format = (v) => String(v),
}: {
  data: LinePoint[];
  width?: number;
  height?: number;
  format?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <div style={{ width, height }} className="flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((d, i) => {
      const x = data.length > 1 ? i * stepX : width / 2;
      const y = height - (d.value / max) * (height - 12) - 6;
      return `${x},${y}`;
    })
    .join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  const last = data[data.length - 1];

  return (
    <div>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="smmLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#smmLineGrad)" />
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {last ? (
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Latest: <span className="font-bold text-foreground">{format(last.value)}</span>
        </p>
      ) : null}
    </div>
  );
}