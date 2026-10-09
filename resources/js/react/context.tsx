import { createContext, useContext } from 'react';
import type { ComponentType, ElementType, ReactNode } from 'react';
import type { FileLabeller } from '../shared/fileLabels';
import type { BodyProps } from './body';

/** Vue injection seams, supplied together through one React context. */
export interface FeedOptions {
    FEED_LINK?: ElementType;
    /** Complete media override with image, href, linkAttributes and className. */
    FEED_MEDIA?: ElementType;
    FEED_NOW?: number;
    FEED_COMPONENTS?: Readonly<Record<string, ComponentType<any>>>;
    /**
     * Renderers for app body types, keyed by the exact body type. Each gets the
     * built-in bodies' props; a core type here replaces the kit's renderer.
     * Nested providers merge their maps.
     */
    FEED_BODIES?: Readonly<Record<string, ComponentType<BodyProps>>>;
    FEED_FILE_LABELLER?: FileLabeller;
    FEED_MEDIA_OBJECT_PLACEMENT?: 'beside' | 'below';
}
export const FeedContext = createContext<FeedOptions>({});
export function FeedProvider({
    children,
    ...options
}: FeedOptions & { children?: ReactNode }) {
    const parent = useContext(FeedContext);
    return (
        <FeedContext.Provider
            value={{
                ...parent,
                ...options,
                FEED_BODIES: { ...parent.FEED_BODIES, ...options.FEED_BODIES },
            }}
        >
            {children}
        </FeedContext.Provider>
    );
}
export const useFeedOptions = () => useContext(FeedContext);
