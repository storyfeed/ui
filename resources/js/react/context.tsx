import { createContext, useContext } from 'react';
import type { ComponentType, ElementType, ReactNode } from 'react';
import type { FileLabeller } from '../shared/fileLabels';

/** Vue injection seams, supplied together through one React context. */
export interface FeedOptions {
    FEED_LINK?: ElementType;
    FEED_NOW?: number;
    FEED_COMPONENTS?: Readonly<Record<string, ComponentType<any>>>;
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
        <FeedContext.Provider value={{ ...parent, ...options }}>
            {children}
        </FeedContext.Provider>
    );
}
export const useFeedOptions = () => useContext(FeedContext);
