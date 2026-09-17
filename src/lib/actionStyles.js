// Shared affordances for text and icon actions.
//
// These started as literals inside DistanceInput. The anchor panel needs the
// same look, and a second copy would drift the moment one of them is tweaked —
// the same reasoning the MAP_ACCENT comment in RouteMap calls out. Keep one
// copy and import it.
export const textActionClasses =
    "inline-flex min-h-6 items-center gap-1 rounded-md px-0.5 text-sm font-medium underline underline-offset-2 hover:text-foreground transition outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40";

export const iconActionClasses =
    "shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40";