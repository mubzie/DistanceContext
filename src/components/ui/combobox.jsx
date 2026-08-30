"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxInput({ className, ...props }) {
    return (
        <ComboboxPrimitive.Input
            data-slot="combobox-input"
            className={cn(
                "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
                className,
            )}
            {...props}
        />
    );
}

function ComboboxContent({ className, children, ...props }) {
    return (
        <ComboboxPrimitive.Portal>
            <ComboboxPrimitive.Positioner
                sideOffset={4}
                align="start"
                className="isolate z-50"
                {...props}
            >
                <ComboboxPrimitive.Popup
                    data-slot="combobox-content"
                    className={cn(
                        "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                        className,
                    )}
                >
                    {children}
                </ComboboxPrimitive.Popup>
            </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
    );
}

function ComboboxList({ className, ...props }) {
    return (
        <ComboboxPrimitive.List
            data-slot="combobox-list"
            className={cn("scroll-my-1 p-1", className)}
            {...props}
        />
    );
}

// Renders children against the root's *filtered* item set — Base UI applies
// the query filter to the `items` prop, so items must map through a
// Collection (and not the raw array) or the dropdown ignores the query.
function ComboboxCollection({ children, ...props }) {
    return (
        <ComboboxPrimitive.Collection {...props}>
            {children}
        </ComboboxPrimitive.Collection>
    );
}

function ComboboxEmpty({ className, ...props }) {
    return (
        <ComboboxPrimitive.Empty
            data-slot="combobox-empty"
            className={cn("px-2.5 py-2 text-sm text-muted-foreground", className)}
            {...props}
        />
    );
}

function ComboboxItem({ className, children, ...props }) {
    return (
        <ComboboxPrimitive.Item
            data-slot="combobox-item"
            className={cn(
                "relative flex w-full cursor-default select-none items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2.5 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            {children}
            <ComboboxPrimitive.ItemIndicator
                render={
                    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                }
            >
                <CheckIcon className="pointer-events-none" />
            </ComboboxPrimitive.ItemIndicator>
        </ComboboxPrimitive.Item>
    );
}

export {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxItem,
};
