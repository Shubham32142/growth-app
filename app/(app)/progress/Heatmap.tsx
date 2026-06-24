"use client";

interface DayCell {
  date: string; // YYYY-MM-DD
  count: number;
}

interface Props {
  cells: DayCell[];
  year: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function intensity(count: number): string {
  if (count === 0) return "var(--surface-2)";
  if (count === 1) return "#065f46"; // emerald-900
  if (count <= 3) return "#059669"; // emerald-600
  return "var(--accent)"; // emerald-400
}

export default function Heatmap({ cells, year }: Props) {
  const cellMap = new Map(cells.map((c) => [c.date, c.count]));

  // Build a grid: columns = weeks (53 max), rows = days (0=Sun…6=Sat)
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const startOffset = jan1.getUTCDay(); // 0=Sun
  const totalDays =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  const weeks: (string | null)[][] = [];

  let week: (string | null)[] = Array(startOffset).fill(null);
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(Date.UTC(year, 0, 1 + i));
    const iso = d.toISOString().slice(0, 10);
    week.push(iso);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // Month label positions
  const monthLabels: { month: number; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, col) => {
    const firstDay = w.find(Boolean);
    if (!firstDay) return;
    const m = new Date(firstDay).getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({ month: m, col });
      lastMonth = m;
    }
  });

  return (
    <div className="overflow-x-auto pb-2">
      <div style={{ minWidth: weeks.length * 14 + 28 }}>
        {/* Month row */}
        <div className="flex ml-7 mb-1" style={{ gap: 2 }}>
          {weeks.map((_, col) => {
            const label = monthLabels.find((l) => l.col === col);
            return (
              <div
                key={col}
                style={{
                  width: 12,
                  fontSize: 10,
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {label ? MONTHS[label.month] : ""}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0.5">
          {/* Day-of-week labels */}
          <div className="flex flex-col mr-1" style={{ gap: 2 }}>
            {DAYS.map((d, i) => (
              <div
                key={i}
                style={{
                  height: 12,
                  width: 12,
                  fontSize: 9,
                  color: "var(--text-muted)",
                  lineHeight: "12px",
                  textAlign: "right",
                }}
              >
                {i % 2 === 1 ? d : ""}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((w, col) => (
            <div key={col} className="flex flex-col" style={{ gap: 2 }}>
              {w.map((day, row) => (
                <div
                  key={row}
                  title={day ? `${day}: ${cellMap.get(day) ?? 0} tasks` : ""}
                  className={day ? "wave-in" : undefined}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: day
                      ? intensity(cellMap.get(day) ?? 0)
                      : "transparent",
                    // Diagonal reveal: cells light up in a left-to-right wave.
                    animationDelay: day
                      ? `${Math.min(col * 6 + row * 14, 1200)}ms`
                      : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
