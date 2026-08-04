const KNOWN_LOCATIONS = [
    {
        name: "Lagos",
        aliases: ["lagos", "lagos nigeria", "lagos, nigeria"],
        lat: 6.5244,
        lng: 3.3792,
        importance: 1,
        displayName: "Lagos, Nigeria",
    },
];

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function findKnownLocation(query) {
    const normalizedQuery = normalize(query);
    const location = KNOWN_LOCATIONS.find((candidate) =>
        candidate.aliases.some((alias) => normalize(alias) === normalizedQuery),
    );

    if (!location) return null;

    return {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        importance: location.importance,
        displayName: location.displayName,
    };
}
