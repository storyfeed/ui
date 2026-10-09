import type { BodyProps } from '../../resources/js/react';

/** An app body type, registered through `FEED_BODIES`. */
export default function Shipment({ payload }: BodyProps) {
    return (
        <p className="sf-shipment m-0 text-base text-foreground [overflow-wrap:anywhere]">
            {payload.carrier ?? ''} · {payload.tracking ?? ''}
        </p>
    );
}
