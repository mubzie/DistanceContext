export function formatNumber(value, digits = 1) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    }).format(value);
}

export function formatTime(minutes) {
    const rounded = Math.max(1, Math.round(minutes));
    if (rounded < 60) {
        return `${rounded} minute${rounded === 1 ? "" : "s"}`;
    }

    const hours = Math.floor(rounded / 60);
    const remaining = rounded % 60;
    if (!remaining) {
        return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    return `${hours} hour${hours === 1 ? "" : "s"} ${remaining} minute${remaining === 1 ? "" : "s"}`;
}

export function formatTimeShort(minutes) {
    const rounded = Math.max(1, Math.round(minutes));
    if (rounded < 60) {
        return `${rounded} min`;
    }
    const hours = Math.floor(rounded / 60);
    const remaining = rounded % 60;
    return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
}

const KM_TO_MILES = 0.621371;

export function distanceInUnit(km, unit) {
    return unit === "miles" ? km * KM_TO_MILES : km;
}

export function distancePrecision(km) {
    return km >= 10 ? 0 : 1;
}

export function formatDistance(km, unit, digits) {
    const precision = digits ?? distancePrecision(km);
    return `${formatNumber(distanceInUnit(km, unit), precision)} ${unit}`;
}
