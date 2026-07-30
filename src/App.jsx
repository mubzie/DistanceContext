import { useEffect } from "react";
import { DistanceInput } from "./components/DistanceInput";
import { ContextSummary } from "./components/ContextSummary";
import { RouteMap } from "./components/RouteMap";
import { useDistanceContext } from "./hooks/useDistanceContext";

export default function App() {
  const context = useDistanceContext();

  useEffect(() => {
    document.title = "DistanceContext";
  }, []);

  return (
    <main className="h-screen overflow-hidden relative bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_38%)]">
      <div className="mx-auto flex h-full w-full">
        <div className="left-panel flex flex-1 gap-6 flex-col px-6 py-14 overflow-y-auto">
          <div className="mx-auto w-full max-w-[600px] flex flex-col gap-6">
            <DistanceInput {...context} />
            <div className="space-y-6">
              <ContextSummary
                summary={context.summary}
                routeDistanceKm={context.routeDistanceKm}
                baseDistanceKm={context.baseDistanceKm}
                multiplier={context.multiplier}
                estimatedMinutes={context.estimatedMinutes}
                travelMode={context.travelMode}
                route={context.mapRoute}
              />
            </div>
          </div>
        </div>

        <div className="sticky top-0 h-screen w-[600px] shrink-0 overflow-hidden">
          <RouteMap
              route={context.mapRoute}
              actualRouteCoords={context.actualRouteCoords}
              isRouteLoading={context.isRouteLoading}
              userLocation={context.userLocation}
            />
        </div>
      </div>
    </main>
  );
}
