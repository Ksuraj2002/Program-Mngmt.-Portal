import type { CampusAggregateRow, SubjectAggregateRow } from "@/lib/tracker/queries";
import type { Campus } from "@/types/database";

type SubjectAgg = { row: SubjectAggregateRow; campus: Campus };

const BRAND = "#2543c2";
const BRAND_SOFT = "#d9e6ff";
const SLATE = "#94a3b8";
const EMERALD = "#10b981";

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

// Stacked-ish bar per subject: participants vs enrolled.
function SubjectParticipationChart({ rows }: { rows: SubjectAgg[] }) {
  const data = rows;
  if (data.length === 0) return null;

  const barW = 34;
  const gap = 16;
  const chartH = 180;
  const paddingBottom = 60;
  const paddingTop = 20;
  const width = data.length * (barW + gap) + 40;
  const height = chartH + paddingBottom + paddingTop;

  const maxEnrolled = Math.max(...data.map((r) => r.row.student_count), 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMid meet"
      className="w-full max-w-4xl"
      style={{ maxHeight: 280 }}
      role="img"
      aria-label="Participants vs enrolled per subject"
    >
      {[0, 0.5, 1].map((frac) => {
        const y = paddingTop + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={30} x2={width - 10} y1={y} y2={y} stroke="#e2e8f0" />
            <text
              x={26}
              y={y}
              fontSize={9}
              fill={SLATE}
              textAnchor="end"
              dominantBaseline="central"
            >
              {Math.round(maxEnrolled * frac)}
            </text>
          </g>
        );
      })}
      {data.map(({ row, campus }, i) => {
        const x = 30 + i * (barW + gap);
        const enrolledH = (row.student_count / maxEnrolled) * chartH;
        const partFrac =
          row.student_count > 0 ? row.participants / row.student_count : 0;
        const partH = enrolledH * partFrac;
        const yEnrolled = paddingTop + chartH - enrolledH;
        const yPart = paddingTop + chartH - partH;
        const label = truncate(`${row.subject_name}`, 14);
        return (
          <g key={row.subject_id}>
            <rect
              x={x}
              y={yEnrolled}
              width={barW}
              height={enrolledH}
              fill={BRAND_SOFT}
              rx={3}
            />
            <rect
              x={x}
              y={yPart}
              width={barW}
              height={partH}
              fill={EMERALD}
              rx={3}
            />
            <text
              x={x + barW / 2}
              y={paddingTop + chartH + 12}
              fontSize={9}
              fill="#334155"
              textAnchor="middle"
              transform={`rotate(-35 ${x + barW / 2} ${
                paddingTop + chartH + 12
              })`}
            >
              {label}
            </text>
            <text
              x={x + barW / 2}
              y={paddingTop + chartH + 46}
              fontSize={8}
              fill={SLATE}
              textAnchor="middle"
              transform={`rotate(-35 ${x + barW / 2} ${
                paddingTop + chartH + 46
              })`}
            >
              {truncate(campus.name, 12)}
            </text>
            <title>
              {`${campus.name} · ${row.subject_name}\n${row.participants} / ${row.student_count} participated`}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

// Grouped bar chart comparing campuses across multiple normalized metrics.
function CampusComparisonChart({ rows }: { rows: CampusAggregateRow[] }) {
  const data = rows;
  if (data.length === 0) return null;

  const metrics = [
    {
      key: "completion",
      label: "Avg % completion",
      color: BRAND,
      normalized: (r: CampusAggregateRow) =>
        Math.max(0, Math.min(100, r.avg_pct_completion)),
      display: (r: CampusAggregateRow) => `${r.avg_pct_completion}%`,
    },
    {
      key: "participation",
      label: "Participation rate",
      color: EMERALD,
      normalized: (r: CampusAggregateRow) =>
        r.studentCount
          ? Math.max(0, Math.min(100, (r.participants / r.studentCount) * 100))
          : 0,
      display: (r: CampusAggregateRow) =>
        r.studentCount
          ? `${Math.round((r.participants / r.studentCount) * 100)}%`
          : "0%",
    },
  ];

  const groupPad = 32;
  const barW = 26;
  const groupW = metrics.length * barW + groupPad;
  const chartH = 200;
  const paddingBottom = 60;
  const paddingTop = 20;
  const leftPad = 36;
  const width = leftPad + data.length * groupW + 20;
  const height = chartH + paddingBottom + paddingTop;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMid meet"
      className="w-full max-w-4xl"
      style={{ maxHeight: 320 }}
      role="img"
      aria-label="Campus comparison across metrics"
    >
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = paddingTop + chartH * (1 - tick / 100);
        return (
          <g key={tick}>
            <line
              x1={leftPad}
              x2={width - 10}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray={tick === 0 || tick === 100 ? undefined : "2 3"}
            />
            <text
              x={leftPad - 6}
              y={y}
              fontSize={9}
              fill={SLATE}
              textAnchor="end"
              dominantBaseline="central"
            >
              {tick}
            </text>
          </g>
        );
      })}
      {data.map((r, gi) => {
        const gx = leftPad + gi * groupW + groupPad / 2;
        return (
          <g key={r.campus.id}>
            {metrics.map((m, mi) => {
              const x = gx + mi * barW;
              const n = Math.max(0, Math.min(100, m.normalized(r)));
              const h = (n / 100) * chartH;
              const y = paddingTop + chartH - h;
              return (
                <g key={m.key}>
                  <rect
                    x={x + 1}
                    y={y}
                    width={barW - 2}
                    height={h}
                    fill={m.color}
                    rx={2}
                  >
                    <title>{`${r.campus.name} — ${m.label}: ${m.display(
                      r
                    )}`}</title>
                  </rect>
                </g>
              );
            })}
            <text
              x={gx + (metrics.length * barW) / 2}
              y={paddingTop + chartH + 14}
              fontSize={10}
              fill="#334155"
              textAnchor="middle"
              transform={`rotate(-25 ${gx + (metrics.length * barW) / 2} ${
                paddingTop + chartH + 14
              })`}
            >
              {truncate(r.campus.name, 18)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ComparisonLegend() {
  const items = [
    { color: BRAND, label: "Avg % completion" },
    { color: EMERALD, label: "Participation rate" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function TrackerCharts({
  campusRows,
  subjectRows,
}: {
  campusRows: CampusAggregateRow[];
  subjectRows: SubjectAgg[];
}) {
  const hasCampus = campusRows.length > 0;
  const hasSubject = subjectRows.length > 0;
  if (!hasCampus && !hasSubject) return null;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900">At a glance</h2>
      <p className="mt-1 text-sm text-slate-500">
        Visual overview of completion and participation across campuses and
        subjects.
      </p>

      {hasCampus && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">
            Avg % completion by campus
          </h3>
          <div className="mt-3 overflow-x-auto">
            <CampusCompletionChart rows={campusRows} />
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {hasCampus && campusRows.length > 1 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-700">
                Campus comparison
              </h3>
              <ComparisonLegend />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              How much of the material students are completing, and how many
              are showing up. Both on a 0–100% scale.
            </p>
            <div className="mt-3 overflow-x-auto">
              <CampusComparisonChart rows={campusRows} />
            </div>
          </div>
        )}

        {hasSubject && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-700">
                Participation by subject
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: BRAND_SOFT }}
                  />
                  Enrolled
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: EMERALD }}
                  />
                  Participated
                </span>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <SubjectParticipationChart rows={subjectRows} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
