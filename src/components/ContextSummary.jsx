import { Clock3, Gauge, MoveRight } from "lucide-react";
import { formatNumber, formatTime } from "../utils/format";

export function ContextSummary({
  summary,
  routeDistanceKm,
  baseDistanceKm,
  multiplier,
  estimatedMinutes,
  travelMode,
  route,
}) {
  if (!route) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg bg-slate-900 p-6 text-white sm:p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
          Context
        </p>
        <p className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
          {summary}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<Gauge className="h-4 w-4" />} label="Base route">
          {formatNumber(baseDistanceKm, 2)} km
        </MetricCard>
        <MetricCard icon={<MoveRight className="h-4 w-4" />} label="Multiplier">
          {formatNumber(multiplier, 1)}x
        </MetricCard>
        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Estimated time"
        >
          {formatTime(estimatedMinutes)}
        </MetricCard>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_4px_0_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {travelMode === "walking" ? "Walking" : "Driving / Transit"}
          </span>
          <span>
            Route shown: {route.start} to {route.end}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Detail label="Route distance">
            {formatNumber(routeDistanceKm, 2)} km
          </Detail>
          <Detail label="Context speed">
            {travelMode === "walking" ? "5 km/h" : "30 km/h"}
          </Detail>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, children }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_4px_0_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">
        {children}
      </div>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-900">{children}</p>
    </div>
  );
}
