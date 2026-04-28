interface MetricCardProps {
  label: string;
  value: number;
  tone?: "default" | "urgent" | "calm";
}

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  return (
    <div className={`metricCard metricCard--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
