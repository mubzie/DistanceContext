import { lazy, Suspense, useEffect } from "react";
import { DistanceInput } from "./components/DistanceInput";
import { ContextSummary } from "./components/ContextSummary";
import { Skeleton } from "./components/ui/skeleton";
import { useDistanceContext } from "./hooks/useDistanceContext";

const RouteMap = lazy(() =>
    import("./components/RouteMap").then((m) => ({ default: m.RouteMap })),
);

export default function App() {
    const context = useDistanceContext();

    useEffect(() => {
        document.title = "DistanceContext";
    }, []);

    return (
        <main className="h-screen overflow-hidden relative bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_38%)]">
            <div className="mx-auto flex flex-col md:flex-row h-full w-full">
                <div className="md:sticky md:top-0 h-[40vh] md:h-screen w-full md:w-[600px] md:order-last shrink-0 overflow-hidden">
                    <Suspense
                        fallback={
                            <div className="flex h-full w-full items-center justify-center">
                                <Skeleton className="h-full w-full rounded-none" />
                            </div>
                        }
                    >
                        <RouteMap
                            route={context.mapRoute}
                            actualRouteCoords={context.actualRouteCoords}
                            isRouteLoading={context.isRouteLoading}
                            userLocation={context.userLocation}
                            mode={context.mode}
                            routeDistanceKm={context.routeDistanceKm}
                            displayDistanceKm={context.displayDistanceKm}
                            estimatedMinutes={context.estimatedMinutes}
                            travelMode={context.travelMode}
                            distanceUnit={context.distanceUnit}
                        />
                    </Suspense>
                </div>

                <div className="left-panel flex flex-1 gap-6 flex-col px-4 py-8 md:px-6 md:py-14 overflow-y-auto">
                    <div className="mx-auto w-full max-w-[600px] flex flex-col gap-6">
                        <DistanceInput {...context} />
                        <div className="space-y-6">
                            <ContextSummary
                                summary={context.summary}
                                routeDistanceKm={context.routeDistanceKm}
                                displayDistanceKm={context.displayDistanceKm}
                                baseDistanceKm={context.baseDistanceKm}
                                multiplier={context.multiplier}
                                estimatedMinutes={context.estimatedMinutes}
                                travelMode={context.travelMode}
                                route={context.mapRoute}
                                mode={context.mode}
                                distanceUnit={context.distanceUnit}
                                actualRouteKm={context.actualRouteKm}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
