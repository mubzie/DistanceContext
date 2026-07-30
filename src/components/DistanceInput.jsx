"use client";

import { MapPinned, Route, MoveRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Input } from "./ui/input";

export function DistanceInput({
  mode,
  setMode,
  distanceValue,
  setDistanceValue,
  distanceUnit,
  setDistanceUnit,
  travelMode,
  setTravelMode,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,

  nearbyPlaces,
  placesLoading,
  routeSuggestions,
}) {
  const placeNames = nearbyPlaces?.map((p) => p.name) ?? [];

  const isActive = (route) => customStart === route.start && customEnd === route.end;

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardContent className="flex flex-col items-center gap-6 p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
            DistanceContext
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Make distances feel familiar
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
            Turn a number into a route you already know, plus the time it would
            likely take.
          </p>
        </div>

        <div className="flex items-center w-max justify-center rounded-full bg-muted p-1">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="bg-transparent p-0 h-auto [--card-spacing:0px]">
              <TabsTrigger
                value="distance"
                className="flex items-center gap-2 rounded-full px-5 py-2.5 data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground"
              >
                <Route className="h-4 w-4" />
                By Distance
              </TabsTrigger>
              <TabsTrigger
                value="route"
                className="flex items-center gap-2 rounded-full px-5 py-2.5 data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground"
              >
                <MapPinned className="h-4 w-4" />
                By Route
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Travel mode
            </span>
            <Select value={travelMode} onValueChange={setTravelMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walking">Walking</SelectItem>
                <SelectItem value="driving">Driving / Transit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "distance" ? (
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Distance
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={distanceValue}
                  onChange={(event) => setDistanceValue(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Unit</span>
                <Select value={distanceUnit} onValueChange={setDistanceUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km">km</SelectItem>
                    <SelectItem value="miles">miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Start
                </span>
                <Input
                  list="nearby-places"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  placeholder="Start location"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">End</span>
                <Input
                  list="nearby-places"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  placeholder="End location"
                />
              </div>
              <datalist id="nearby-places">
                {placeNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          )}
        </div>

        {placesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding places near you…
          </div>
        ) : (
          <div className="grid w-full gap-3 md:grid-cols-2">
            {routeSuggestions.map((route) => {
              const active = isActive(route);
              return (
                <button
                  key={`${route.start}-${route.end}`}
                  type="button"
                  onClick={() => {
                    setMode("route");
                    setCustomStart(route.start);
                    setCustomEnd(route.end);
                  }}
                  className={`rounded-lg border px-4 py-4 text-left transition ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MoveRight className="h-4 w-4" />
                    <span className="font-medium">
                      {route.start} → {route.end}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      active
                        ? "text-muted-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {route.baseDistanceKm.toFixed(1)} km
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
