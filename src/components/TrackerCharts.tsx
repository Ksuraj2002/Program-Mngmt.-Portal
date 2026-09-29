import type { CampusAggregateRow } from "@/lib/tracker/queries";

const BRAND = "#2543c2";
const BRAND_SOFT = "#d9e6ff";
const SLATE = "#94a3b8";

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Horizontal bar chart: avg % completion per campus.
function CampusCompletionChart({ rows }: { rows: CampusAggregateRow[] }) {
  const data = rows;
  if (data.length === 0) return null;

  const rowH = 32;
  const gap = 8;
  const labelW = 140;
  const chartW = 480;
  const width = labelW + chartW + 20;
  const height = data.length * (rowH + gap) + 20;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMid meet"
      className="w-full max-w-3xl"
      style={{ maxHeight: 260 }}
      role="img"
      aria-label="Average percent completion per campus"
    >
      {[0, 25, 50, 75, 100].map((tick) => {
        const x = labelW + (tick / 100) * chartW;
        return (
          <g key={tick}>
            <line
              x1={x}
              y1={10}
              x2={x}
              y2={height - 10}
              stroke="#e2e8f0"
              strokeDasharray={tick === 0 || tick === 100 ? undefined : "2 3"}
            />
            <text
              x={x}
              y={height - 2}
              fontSize={9}
              fill={SLATE}
              textAnchor="middle"
            >
              {tick}%
            </text>
          </g>
        );
      })}
      {data.map((r, i) => {
        const y = 10 + i * (rowH + gap);
        const pct = Math.max(0, Math.min(100, r.avg_pct_completion));
        const barW = (pct / 100) * chartW;
        return (
          <g key={r.campus.id}>
            <text
              x={labelW - 8}
              y={y + rowH / 2}
              fontSize={11}
              fill="#334155"
              textAnchor="end"
              dominantBaseline="central"
            >
              {truncate(r.campus.name, 22)}
            </text>
            <rect
              x={labelW}
              y={y}
              width={chartW}
              height={rowH}
              fill={BRAND_SOFT}
              opacity={0.4}
              rx={4}
            />
            <rect
              x={labelW}
              y={y}
              width={barW}
              height={rowH}
              fill={BRAND}
              rx={4}
            />
            <text
              x={labelW + barW + 6}
              y={y + rowH / 2}
              fontSize={11}
              fill="#1e293b"
              dominantBaseline="central"
              fontWeight={600}
            >
              {r.avg_pct_completion}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TrackerCharts({
  campusRows,
}: {
  campusRows: CampusAggregateRow[];
}) {
  const hasCampus = campusRows.length > 0;
  if (!hasCampus) return null;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900">At a glance</h2>
      <p className="mt-1 text-sm text-slate-500">
        Average percent completion across campuses.
      </p>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-700">
          Avg % completion by campus
        </h3>
        <div className="mt-3 overflow-x-auto">
          <CampusCompletionChart rows={campusRows} />
        </div>
      </div>
    </section>
  );
}
