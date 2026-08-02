"use client";

import { useMemo, useState } from "react";
import {
    MapPinned,
    Route,
    MoveRight,
    Loader2,
    MapPin,
    Search,
    X,
    RefreshCw,
    CircleAlert,
} from "lucide-react";
import { formatDistance } from "../utils/format";
import { normalizePlace } from "../utils/placeMatch";
import { LAGOS_PLACES } from "../data/lagosPlaces";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "./ui/select";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

const MIN_PLACES = 2;

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
    startPlaceLoading,
    startPlaceError,
    endPlaceLoading,
    endPlaceError,
    startOutsideArea,
    endOutsideArea,
    routeTooFar,
    maxRouteKm,
    routeDistanceKm,

    nearbyPlaces,
    placesLoading,
    placesError,
    retryPlaces,
    routeSuggestions,

    locationName,
    locationLoading,
    locationError,
    locationQuery,
    setLocationQuery,
    locationSearchLoading,
    locationSearchError,
    handleLocationSearch,
}) {
    const [showLocationSearch, setShowLocationSearch] = useState(false);
    const [locationInput, setLocationInput] = useState("");

    const placeNames = useMemo(() => {
        const seen = new Set();
        const names = [];
        for (const p of nearbyPlaces ?? []) {
            const key = normalizePlace(p.name);
            if (!seen.has(key)) {
                seen.add(key);
                names.push(p.name);
            }
        }
        for (const p of LAGOS_PLACES) {
            const key = normalizePlace(p.name);
            if (!seen.has(key)) {
                seen.add(key);
                names.push(p.name);
            }
        }
        return names;
    }, [nearbyPlaces]);

    const isActive = (route) =>
        customStart === route.start && customEnd === route.end;

    const handleSearchSubmit = () => {
        handleLocationSearch(locationInput);
        setShowLocationSearch(false);
        setLocationInput("");
    };

    const renderLocationBar = () => {
        if (locationLoading) {
            return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting your location&hellip;
                </div>
            );
        }

        if (showLocationSearch) {
            return (
                <div className="flex w-full items-center gap-2">
                    <Input
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="Search for a city or area"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearchSubmit();
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleSearchSubmit}
                        disabled={
                            locationSearchLoading || !locationInput.trim()
                        }
                        className="shrink-0 rounded-lg border border-border p-2 hover:bg-muted transition disabled:opacity-40"
                    >
                        {locationSearchLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowLocationSearch(false);
                            setLocationInput("");
                        }}
                        className="shrink-0 rounded-lg border border-border p-2 hover:bg-muted transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            );
        }

        if (locationError) {
            return (
                <div className="flex w-full items-center justify-between gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>Location unavailable</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowLocationSearch(true)}
                        className="shrink-0 text-sm font-medium underline underline-offset-2 hover:text-foreground transition"
                    >
                        Set manually
                    </button>
                </div>
            );
        }

        return (
            <div className="flex w-full items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{locationName}</span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowLocationSearch(true)}
                    className="shrink-0 text-sm font-medium underline underline-offset-2 hover:text-foreground transition"
                >
                    Change
                </button>
            </div>
        );
    };

    const renderPlacesStatus = () => {
        if (placesLoading) {
            return (
                <div className="flex w-full flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finding places near you&hellip;
                    </div>
                    <div className="grid w-full gap-3 md:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-lg border border-border p-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                                <Skeleton className="mt-2 h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (placesError) {
            return (
                <div className="flex items-center gap-2 text-sm text-destructive">
                    <span>Failed to load nearby places.</span>
                    <button
                        type="button"
                        onClick={retryPlaces}
                        className="flex items-center gap-1 underline underline-offset-2"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                    </button>
                </div>
            );
        }

        if (!nearbyPlaces || nearbyPlaces.length < MIN_PLACES) {
            return (
                <p className="text-sm text-muted-foreground">
                    {nearbyPlaces?.length === 0
                        ? "No places found near this location. Try a different area."
                        : "Only one place found. Need at least two for comparisons."}
                </p>
            );
        }

        return null;
    };

    return (
        <Card className="mx-auto w-full max-w-4xl">
            <CardContent className="flex flex-col items-center gap-4 md:gap-6 p-4 sm:p-6 md:p-8">
                <div className="space-y-2 text-center">
                    <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
                        DistanceContext
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Make distances feel familiar
                    </h1>
                    <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
                        Turn a number into a route you already know, plus the
                        time it would likely take.
                    </p>
                </div>

                {renderLocationBar()}

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
                        <Select
                            value={travelMode}
                            onValueChange={setTravelMode}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="walking">Walking</SelectItem>
                                <SelectItem value="driving">
                                    Driving / Transit
                                </SelectItem>
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
                                    onChange={(event) =>
                                        setDistanceValue(event.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <span className="text-sm font-medium text-foreground">
                                    Unit
                                </span>
                                <Select
                                    value={distanceUnit}
                                    onValueChange={setDistanceUnit}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="km">km</SelectItem>
                                        <SelectItem value="miles">
                                            miles
                                        </SelectItem>
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
                                    onChange={(event) =>
                                        setCustomStart(event.target.value)
                                    }
                                    placeholder="Start location"
                                />
                                {startPlaceError ? (
                                    <p className="text-xs text-destructive">
                                        {startPlaceError}
                                    </p>
                                ) : startPlaceLoading ? (
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Finding {customStart.trim()}&hellip;
                                    </p>
                                ) : startOutsideArea ? (
                                    <p className="text-xs text-muted-foreground">
                                        Searched &mdash; outside your nearby
                                        area
                                    </p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <span className="text-sm font-medium text-foreground">
                                    End
                                </span>
                                <Input
                                    list="nearby-places"
                                    value={customEnd}
                                    onChange={(event) =>
                                        setCustomEnd(event.target.value)
                                    }
                                    placeholder="End location"
                                />
                                {endPlaceError ? (
                                    <p className="text-xs text-destructive">
                                        {endPlaceError}
                                    </p>
                                ) : endPlaceLoading ? (
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Finding {customEnd.trim()}&hellip;
                                    </p>
                                ) : endOutsideArea ? (
                                    <p className="text-xs text-muted-foreground">
                                        Searched &mdash; outside your nearby
                                        area
                                    </p>
                                ) : null}
                            </div>
                            <datalist id="nearby-places">
                                {placeNames.map((name) => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                            {routeTooFar && (
                                <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-destructive">
                                    <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                                    Too far for local context &mdash;
                                    that&rsquo;s{" "}
                                    {formatDistance(
                                        routeDistanceKm,
                                        distanceUnit,
                                    )}
                                    . Routes are limited to {maxRouteKm} km. Try
                                    places closer together.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {renderPlacesStatus()}

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
                                                {route.start} &rarr; {route.end}
                                            </span>
                                        </div>
                                        <p
                                            className={`mt-1 text-sm ${
                                                active
                                                    ? "text-muted-foreground/70"
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
            </CardContent>
        </Card>
    );
}
