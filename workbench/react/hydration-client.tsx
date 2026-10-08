import { hydrateRoot } from 'react-dom/client';
import HydrationFixture from './HydrationFixture';
const errors: string[] = [];
const pinned = new URLSearchParams(location.search).has('pinned');
const root = hydrateRoot(
    document.getElementById('app')!,
    <HydrationFixture pinned={pinned} />,
    { onRecoverableError: (error) => errors.push(String(error)) },
);
Object.assign(window, {
    hydrationErrors: errors,
    unmountFeed: () => root.unmount(),
});
