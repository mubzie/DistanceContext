import { Footprints, Car } from "lucide-react";
import {
    formatNumber,
    formatTime,
    distanceInUnit,
    distancePrecision,
} from "../utils/format";

export function MapOverlay({
    route,
    distanceKm,
    estimatedMinutes,
    travelMode,
    distanceUnit,
}) {
    if (!route || !distanceKm) return null;

    const isWalking = travelMode === "walking";
    const displayDistance = formatNumber(
        distanceInUnit(distanceKm, distanceUnit),
        distancePrecision(distanceKm),
    );
    const unit = distanceUnit;
    const displayTime = formatTime(estimatedMinutes);

    return (
        <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 z-10 pointer-events-none">
            <div className="flex flex-col gap-2 md:gap-3 rounded-xl md:rounded-2xl bg-foreground/80 backdrop-blur-md px-3 py-2.5 md:px-5 md:py-4 text-background shadow-xl">
                <div className="flex items-center gap-1.5 md:gap-2">
                    {isWalking ? (
                        <Footprints className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                    ) : (
                        <Car className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                    )}
                    <span className="text-xs md:text-sm font-medium truncate">
                        {route.start} → {route.end}
                    </span>
                </div>
                <div className="flex gap-4 md:gap-6">
                    <div className="flex flex-col">
                        <span className="text-lg md:text-xl font-semibold leading-none tracking-tight">
                            {displayDistance}
                        </span>
                        <span className="mt-1 text-[10px] md:text-xs uppercase tracking-wider opacity-70">
                            {unit}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg md:text-xl font-semibold leading-none tracking-tight">
                            {displayTime}
                        </span>
                        <span className="mt-1 text-[10px] md:text-xs uppercase tracking-wider opacity-70">
                            time
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
