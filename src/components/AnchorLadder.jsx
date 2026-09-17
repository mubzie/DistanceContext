import { formatDistance } from "../utils/format";
import { Badge } from "./ui/badge";

// Supporting detail for the context sentence, rendered deliberately outside
// the ContextSentence live region: that region is polite-announced on every
// change, and re-reading the whole ladder on each keystroke would make typing
// a distance painful with a screen reader.
export function AnchorLadder({ frames = [], distanceUnit }) {
    if (!frames.length) return null;

    return (
        <ul
            aria-label="How this distance compares"
            className="flex w-full flex-col gap-2"
        >
            {frames.map((frame) => (
                <li
                    key={frame.anchor.id}
                    className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3"
                >
                    <Badge variant="secondary" className="tabular-nums">
                        {frame.ladder}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                        {frame.anchor.label}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                        {formatDistance(frame.spanKm, distanceUnit)}
                    </span>
                </li>
            ))}
        </ul>
    );
}