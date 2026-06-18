import { useEffect } from 'react';
import { DistanceInput } from './components/DistanceInput';
import { ContextSummary } from './components/ContextSummary';
import { RouteMap } from './components/RouteMap';
import { useDistanceContext } from './hooks/useDistanceContext';

export default function App() {
  const context = useDistanceContext();

  useEffect(() => {
    document.title = 'DistanceContext';
  }, []);

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_38%)]">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DistanceInput {...context} />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
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
          <RouteMap route={context.mapRoute} />
        </div>
      </div>
    </main>
  );
}
