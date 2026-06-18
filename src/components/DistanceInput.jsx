import { MapPinned, Route, MoveRight } from 'lucide-react';
import { frequentLocations, frequentRoutes } from '../data/frequentRoutes';

export function DistanceInput({
  mode,
  setMode,
  distanceValue,
  setDistanceValue,
  distanceUnit,
  setDistanceUnit,
  travelMode,
  setTravelMode,
  selectedRouteId,
  setSelectedRouteId,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd
}) {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-slate-200/80 sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
            DistanceContext
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Make distances feel familiar
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600">
            Turn a number into a route you already know, plus the time it would
            likely take.
          </p>
        </div>

        <div className="flex items-center justify-center rounded-full bg-slate-100 p-1">
          <TabButton active={mode === 'distance'} onClick={() => setMode('distance')}>
            <Route className="h-4 w-4" />
            By Distance
          </TabButton>
          <TabButton active={mode === 'route'} onClick={() => setMode('route')}>
            <MapPinned className="h-4 w-4" />
            By Route
          </TabButton>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Travel mode</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              value={travelMode}
              onChange={(event) => setTravelMode(event.target.value)}
            >
              <option value="walking">Walking</option>
              <option value="driving">Driving / Transit</option>
            </select>
          </label>

          {mode === 'distance' ? (
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Distance</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={distanceValue}
                  onChange={(event) => setDistanceValue(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Unit</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={distanceUnit}
                  onChange={(event) => setDistanceUnit(event.target.value)}
                >
                  <option value="km">km</option>
                  <option value="miles">miles</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Start</span>
                <input
                  list="frequent-locations"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  placeholder="Start location"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">End</span>
                <input
                  list="frequent-locations"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  placeholder="End location"
                />
              </label>
              <datalist id="frequent-locations">
                {frequentLocations.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {frequentRoutes.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => {
                setSelectedRouteId(route.id);
                setCustomStart(route.start);
                setCustomEnd(route.end);
              }}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                selectedRouteId === route.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <MoveRight className="h-4 w-4" />
                <span className="font-medium">
                  {route.start} → {route.end}
                </span>
              </div>
              <p className={`mt-1 text-sm ${selectedRouteId === route.id ? 'text-slate-300' : 'text-slate-500'}`}>
                {route.notes}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
      }`}
    >
      {children}
    </button>
  );
}
