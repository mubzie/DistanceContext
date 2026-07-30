import { Clock3, Gauge, MoveRight } from "lucide-react";
import { formatNumber, formatTime } from "../utils/format";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

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
      <div className="rounded-lg bg-foreground p-6 text-background sm:p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground/70">
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
        <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Estimated time">
          {formatTime(estimatedMinutes)}
        </MetricCard>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {travelMode === "walking" ? "Walking" : "Driving / Transit"}
            </Badge>
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
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({ icon, label, children }) {
  return (
    <Card size="sm" className="gap-2">
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-lg font-semibold text-foreground">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-medium text-foreground">{children}</p>
    </div>
  );
}
