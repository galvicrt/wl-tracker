import { ExerciseProgress, ProgressRange } from "../shared/progress";

type Props = {
  progress: ExerciseProgress[];
  range: ProgressRange;
};

const colors = ["#146c94", "#c2410c", "#4d7c0f", "#7c3aed"];

const formatVolume = (value: number) =>
  value >= 10000 ? Math.round(value).toLocaleString("en") : Math.round(value).toString();

export function ProgressChart({ progress, range }: Props) {
  const allPoints = progress.flatMap((exercise) => exercise.points);
  const maxVolume = Math.max(1, ...allPoints.map((point) => point.bestVolume));
  const periods = [...new Set(allPoints.map((point) => point.periodStart))].sort();
  const width = 900;
  const height = 360;
  const padding = { top: 24, right: 28, bottom: 72, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xForPeriod = (periodStart: string) => {
    const index = periods.indexOf(periodStart);
    if (periods.length <= 1) {
      return padding.left + chartWidth / 2;
    }

    return padding.left + (index / (periods.length - 1)) * chartWidth;
  };

  const yForVolume = (volume: number) =>
    padding.top + chartHeight - (volume / maxVolume) * chartHeight;

  if (allPoints.length === 0) {
    return (
      <div className="chart-empty">
        <p>Add a lift to create your {range} progress graph.</p>
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="chart-title chart-desc"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="chart-title">Weightlifting progress chart</title>
        <desc id="chart-desc">
          Line graph showing peak training volume (weight times sets times reps) for each
          exercise by {range} period.
        </desc>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          const label = formatVolume(maxVolume * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="grid-line"
              />
              <text x={padding.left - 12} y={y + 5} className="axis-label" textAnchor="end">
                {label}
              </text>
            </g>
          );
        })}

        {periods.map((periodStart) => {
          const point = allPoints.find((candidate) => candidate.periodStart === periodStart);
          const x = xForPeriod(periodStart);
          return (
            <g key={periodStart}>
              <line
                x1={x}
                x2={x}
                y1={padding.top}
                y2={padding.top + chartHeight}
                className="period-line"
              />
              <text
                x={x}
                y={height - 34}
                className="axis-label"
                textAnchor="middle"
              >
                {point?.label ?? periodStart}
              </text>
            </g>
          );
        })}

        {progress.map((exercise, exerciseIndex) => {
          const path = exercise.points
            .map((point, pointIndex) => {
              const command = pointIndex === 0 ? "M" : "L";
              return `${command} ${xForPeriod(point.periodStart)} ${yForVolume(point.bestVolume)}`;
            })
            .join(" ");
          const color = colors[exerciseIndex % colors.length];

          return (
            <g key={exercise.exerciseId}>
              <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" />
              {exercise.points.map((point) => (
                <circle
                  key={`${exercise.exerciseId}-${point.periodStart}`}
                  cx={xForPeriod(point.periodStart)}
                  cy={yForVolume(point.bestVolume)}
                  r="6"
                  fill={color}
                >
                  <title>
                    {exercise.exerciseName}: volume {formatVolume(point.bestVolume)} (
                    {point.volumeWeight} {point.volumeUnit} × {point.volumeSets} sets ×{" "}
                    {point.volumeReps} reps) in {point.label}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <p className="chart-footnote" aria-hidden="true">
        Y-axis: peak volume (weight × sets × reps) per period.
      </p>

      <ul className="legend" aria-label="Chart legend">
        {progress.map((exercise, index) => (
          <li key={exercise.exerciseId}>
            <span style={{ backgroundColor: colors[index % colors.length] }} />
            {exercise.exerciseName}
          </li>
        ))}
      </ul>
    </div>
  );
}
