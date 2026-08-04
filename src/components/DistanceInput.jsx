"use client";

import { useMemo, useState } from "react";
import {
    MapPinned,
    Route,
    Loader2,
    MapPin,
    Search,
    X,
    RefreshCw,
    CircleAlert,
} from "lucide-react";
import { formatDistance } from "../utils/format";
import { mergePlaceLists } from "../utils/placeMatch";
import { LAGOS_PLACES } from "../data/lagosPlaces";
import { Card, CardContent } from "./ui/card";
import { ContextSentence } from "./ContextSummary";
import { RouteSuggestions } from "./RouteSuggestions";
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

    summary,
    displayDistanceKm,
    baseDistanceKm,
    multiplier,
    estimatedMinutes,
    mapRoute,
    actualRouteKm,

    nearbyPlaces,
    placesLoading,
    placesError,
    placesFallback,
    retryPlaces,
    routeSuggestions,
    hasStartedContext,
    setHasStartedContext,

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
        return mergePlaceLists(nearbyPlaces ?? [], LAGOS_PLACES).map(
            (p) => p.name,
        );
    }, [nearbyPlaces]);

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
                        aria-label="Search for location"
                        className="shrink-0 rounded-lg border border-border p-2.5 hover:bg-muted transition disabled:opacity-40"
                    >
                        {locationSearchLoading ? (
                            <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <Search className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowLocationSearch(false);
                            setLocationInput("");
                        }}
                        aria-label="Cancel location search"
                        className="shrink-0 rounded-lg border border-border p-2.5 hover:bg-muted transition"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
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

        if (placesFallback) {
            return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        Live nearby data unavailable &mdash; using built-in
                        Lagos places.
                    </span>
                    <button
                        type="button"
                        onClick={retryPlaces}
                        className="flex items-center gap-1 underline underline-offset-2"
                    >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        Retry
                    </button>
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
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
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
                        <label
                            htmlFor="travel-mode"
                            className="text-sm font-medium text-foreground"
                        >
                            Travel mode
                        </label>
                        <Select
                            value={travelMode}
                            onValueChange={setTravelMode}
                        >
                            <SelectTrigger id="travel-mode">
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
                                <label
                                    htmlFor="distance"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Distance
                                </label>
                                <Input
                                    id="distance"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*[.]?[0-9]*"
                                    placeholder="0"
                                    value={distanceValue}
                                    onValueChange={(value) => {
                                        const cleaned = String(value ?? "")
                                            .replace(/[^0-9.]/g, "")
                                            .replace(/(\..*)\./g, "$1");
                                        setDistanceValue(cleaned);
                                        if (
                                            cleaned &&
                                            Number(cleaned) > 0
                                        ) {
                                            setHasStartedContext(true);
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="distance-unit"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Unit
                                </label>
                                <Select
                                    value={distanceUnit}
                                    onValueChange={setDistanceUnit}
                                >
                                    <SelectTrigger id="distance-unit">
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
                                <label
                                    htmlFor="start-place"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Start
                                </label>
                                <Input
                                    id="start-place"
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
                                        Outside your nearby area
                                    </p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="end-place"
                                    className="text-sm font-medium text-foreground"
                                >
                                    End
                                </label>
                                <Input
                                    id="end-place"
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
                                        Outside your nearby area
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

                <div className="w-full">
                    {hasStartedContext ? (
                        mapRoute && (
                            <ContextSentence
                                summary={summary}
                                route={mapRoute}
                            />
                        )
                    ) : (
                        <RouteSuggestions
                            routeSuggestions={routeSuggestions}
                            nearbyPlaces={nearbyPlaces}
                            placesLoading={placesLoading}
                            placesError={placesError}
                            distanceUnit={distanceUnit}
                            customStart={customStart}
                            customEnd={customEnd}
                            setMode={setMode}
                            setCustomStart={setCustomStart}
                            setCustomEnd={setCustomEnd}
                            onSelect={() => setHasStartedContext(true)}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
