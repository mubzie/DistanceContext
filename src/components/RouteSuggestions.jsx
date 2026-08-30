import { formatDistance } from "../utils/format";

const MIN_PLACES = 2;

export function RouteSuggestions({
    routeSuggestions,
    nearbyPlaces,
    placesLoading,
    placesError,
    distanceUnit,
    customStart,
    customEnd,
    setMode,
    setCustomStart,
    setCustomEnd,
    onSelect,
}) {
    const isActive = (route) =>
        customStart === route.start && customEnd === route.end;

    return (
        <>
            {placesLoading ||
            placesError ||
            !nearbyPlaces ||
            nearbyPlaces.length < MIN_PLACES
                ? null
                : routeSuggestions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                          Enter a distance to see matching routes.
                      </p>
                  )}

            {!placesLoading &&
                !placesError &&
                nearbyPlaces &&
                nearbyPlaces.length >= MIN_PLACES && (
                    <div className="grid w-full gap-3 md:grid-cols-2">
                        {routeSuggestions.map((route) => {
                            const active = isActive(route);
                            return (
                                <button
                                    key={`${route.start}-${route.end}`}
                                    type="button"
                                    onClick={() => {
                                        onSelect?.();
                                        setMode("route");
                                        setCustomStart(route.start);
                                        setCustomEnd(route.end);
                                    }}
                                    className={`rounded-lg border px-4 py-4 text-left transition outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
                                        active
                                            ? "border-foreground bg-foreground text-background"
                                            : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted/50"
                                    }`}
                                >
                                    <span className="font-medium">
                                        {route.start} &rarr; {route.end}
                                    </span>
                                    <p
                                        className={`mt-1 text-sm ${
                                            active
                                                ? "text-background/70"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {formatDistance(
                                            route.baseDistanceKm,
                                            distanceUnit,
                                        )}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
        </>
    );
}
