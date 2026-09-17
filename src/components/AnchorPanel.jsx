import { useState } from "react";
import { Check, Pencil, Pin, X } from "lucide-react";
import { formatDistance } from "../utils/format";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { iconActionClasses, textActionClasses } from "../lib/actionStyles";

// Pin attempts can fail for ordinary reasons, so they are explained inline
// rather than silently doing nothing.
function reasonMessage(reason, maxAnchors) {
    switch (reason) {
        case "no-route":
            return "Enter a distance or pick a route first.";
        case "duplicate":
            return "That route is already pinned.";
        case "limit":
            return `You can pin up to ${maxAnchors} anchors.`;
        default:
            return "That route can't be pinned.";
    }
}

export function AnchorPanel({
    anchors = [],
    maxAnchors,
    mapRoute,
    pinCurrentRoute,
    removeAnchor,
    renameAnchor,
    distanceUnit,
    setMode,
    setCustomStart,
    setCustomEnd,
    onSelect,
}) {
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState("");
    const [notice, setNotice] = useState(null);

    const handlePin = () => {
        const result = pinCurrentRoute?.();
        // Success needs no notice: the new row is the feedback. `canAdd` is not
        // used to disable the button, so the limit still explains itself.
        setNotice(result?.ok ? null : reasonMessage(result?.reason, maxAnchors));
    };

    const startRename = (anchor) => {
        setEditingId(anchor.id);
        setDraft(anchor.label);
        setNotice(null);
    };

    const commitRename = (event) => {
        event.preventDefault();
        renameAnchor?.(editingId, draft);
        setEditingId(null);
    };

    const useAnchor = (anchor) => {
        onSelect?.();
        setMode("route");
        setCustomStart(anchor.a.name);
        setCustomEnd(anchor.b.name);
    };

    return (
        <Card>
            <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium text-foreground">
                            Your anchors
                        </h2>
                        <Badge variant="secondary" className="tabular-nums">
                            {anchors.length}/{maxAnchors}
                        </Badge>
                    </div>

                    {mapRoute && (
                        <button
                            type="button"
                            onClick={handlePin}
                            className={textActionClasses}
                            aria-label={`Pin the route from ${mapRoute.start} to ${mapRoute.end}`}
                        >
                            <Pin className="h-3 w-3" aria-hidden="true" />
                            Pin this route
                        </button>
                    )}
                </div>

                {anchors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Pin a route you know &mdash; your commute, the school run
                        &mdash; and every distance gets framed against it.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {anchors.map((anchor) => (
                            <li
                                key={anchor.id}
                                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                            >
                                {editingId === anchor.id ? (
                                    <form
                                        onSubmit={commitRename}
                                        className="flex flex-1 items-center gap-3"
                                    >
                                        <label
                                            htmlFor={`anchor-label-${anchor.id}`}
                                            className="sr-only"
                                        >
                                            Anchor name
                                        </label>
                                        <Input
                                            id={`anchor-label-${anchor.id}`}
                                            value={draft}
                                            onValueChange={setDraft}
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            className={iconActionClasses}
                                            aria-label={`Save name for ${anchor.label}`}
                                        >
                                            <Check
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate font-medium text-foreground">
                                                {anchor.label}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {formatDistance(
                                                    anchor.spanKm,
                                                    distanceUnit,
                                                )}{" "}
                                                straight line
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => useAnchor(anchor)}
                                            className={textActionClasses}
                                        >
                                            Use
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startRename(anchor)}
                                            className={iconActionClasses}
                                            aria-label={`Rename ${anchor.label}`}
                                        >
                                            <Pencil
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeAnchor?.(anchor.id)
                                            }
                                            className={iconActionClasses}
                                            aria-label={`Remove ${anchor.label}`}
                                        >
                                            <X
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {notice && (
                    <p role="status" className="text-sm text-muted-foreground">
                        {notice}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}