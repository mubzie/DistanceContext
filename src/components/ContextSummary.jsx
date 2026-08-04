import { Clock3, Gauge, MoveRight } from "lucide-react";
import { formatDistance, formatNumber, formatTime } from "../utils/format";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

export function ContextSentence({ summary, route }) {
    if (!route) return null;
    return (
        <div
            role="status"
            className="rounded-lg bg-foreground p-6 text-background sm:p-8 w-full"
        >
            <p className="text-sm uppercase tracking-[0.25em] text-background/60">
                Context
            </p>
            <p className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
                {summary}
            </p>
        </div>
    );
}

export function ContextMetrics({
    summary,
    routeDistanceKm,
    displayDistanceKm,
    baseDistanceKm,
    multiplier,
    estimatedMinutes,
    travelMode,
    route,
    mode,
    distanceUnit,
    actualRouteKm,
}) {
    if (!route) return null;

    const secondaryKm = mode === "route" ? routeDistanceKm : actualRouteKm;
    const secondaryLabel = mode === "route" ? "Straight-line" : "Road";

    return (
        <Card>
            <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                        icon={<Gauge className="h-4 w-4" />}
                        label="Base route"
                    >
                        {formatDistance(baseDistanceKm, distanceUnit, 2)}
                    </MetricCard>
                    <MetricCard
                        icon={<MoveRight className="h-4 w-4" />}
                        label="Multiplier"
                    >
                        {formatNumber(multiplier, 1)}x
                    </MetricCard>
                    <MetricCard
                        icon={<Clock3 className="h-4 w-4" />}
                        label="Estimated time"
                    >
                        {formatTime(estimatedMinutes)}
                    </MetricCard>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                        {travelMode === "walking"
                            ? "Walking"
                            : "Driving / Transit"}
                    </Badge>
                    <span>
                        Route shown: {route.start} to {route.end}
                    </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Detail
                        label={
                            mode === "route"
                                ? "Route distance"
                                : "Your distance"
                        }
                    >
                        {formatDistance(displayDistanceKm, distanceUnit)}
                        {secondaryKm != null &&
                            Math.abs(secondaryKm - displayDistanceKm) >
                                0.5 && (
                                <span className="mt-1 block text-sm font-normal text-muted-foreground">
                                    {secondaryLabel}:{" "}
                                    {formatDistance(secondaryKm, distanceUnit)}
                                </span>
                            )}
                    </Detail>
                    <Detail label="Assumed speed">
                        {travelMode === "walking" ? "5 km/h" : "30 km/h"}
                    </Detail>
                </div>
            </CardContent>
        </Card>
    );
}

function MetricCard({ icon, label, children }) {
    return (
        <div className="flex flex-col gap-2 rounded-[14px] bg-card p-5 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-lg font-semibold tabular-nums text-foreground">
                {children}
            </div>
        </div>
    );
}

function Detail({ label, children }) {
    return (
        <div className="rounded-[18px] bg-muted p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-base font-medium text-foreground">
                {children}
            </p>
        </div>
    );
}
