import type { Component } from 'vue'
import KeyValue from './KeyValue.vue'
import ComponentBody from './ComponentBody.vue'
import Excerpt from './Excerpt.vue'
import FileAttachment from './FileAttachment.vue'
import Prose from './Prose.vue'
import ItemList from './ItemList.vue'
import Image from './Image.vue'
import MediaObject from './MediaObject.vue'
import Fallback from './Fallback.vue'

/**
 * The body forms this kit draws, by the name a row carries.
 *
 * The map is the whole mechanism: a renderer finds `$body` inside the app's
 * own `data`, looks the name up here, and draws nothing when it does not
 * recognise it — the same rule the read path applies to an unknown verb. The
 * names are core's vocabulary (`Storyfeed\Body`), matched EXACTLY, so the
 * casing is part of the name. An app adds its own types, or replaces these,
 * through `FEED_BODIES`. A body with no renderer that carries a `$fallback`
 * line draws that line instead.
 */
const FORMS: Record<string, Component> = {
  'Storyfeed/Body/Component': ComponentBody,
    'Storyfeed/Body/KeyValue': KeyValue,
    'Storyfeed/Body/Excerpt': Excerpt,
    'Storyfeed/Body/FileAttachment': FileAttachment,
    // Stored rows retain the old token.
    'Storyfeed/Body/File': FileAttachment,
    'Storyfeed/Body/Prose': Prose,
    'Storyfeed/Body/ItemList': ItemList,
    'Storyfeed/Body/Image': Image,
    'Storyfeed/Body/MediaObject': MediaObject,
}

import { inject, type App, type Plugin } from 'vue';
import { fallbackOf, formsIn as discover, resolve as resolveBodies } from '../../shared/body';
import { FEED_BODIES } from '../keys';
export { imageOf } from '../../shared/body';
export type ResolvedDetail = { component: Component; payload: Record<string, any> };
type Bodies = Readonly<Record<string, Component>>;

/**
 * An app's renderer for a type wins over the kit's own, as a published Blade
 * view does. With neither, a body's `$fallback` line stands in for it.
 */
const rendererFor = (name: string, payload: Record<string, any>, bodies: Bodies): Component | undefined =>
    Object.hasOwn(bodies, name) ? bodies[name]
        : Object.hasOwn(FORMS, name) ? FORMS[name]
            : fallbackOf(payload) !== null ? Fallback : undefined;

export const formsIn = (data: unknown, depth = 4, bodies: Bodies = {}): ResolvedDetail[] =>
    discover(data, depth, (name, payload) => rendererFor(name, payload, bodies) !== undefined)
        .map(({ name, payload }) => ({ component: rendererFor(name, payload, bodies)!, payload }));
export const resolve = (body: unknown, bodies: Bodies = {}): ResolvedDetail[] =>
    resolveBodies(body, (name, payload) => rendererFor(name, payload, bodies) !== undefined)
        .map(({ name, payload }) => ({ component: rendererFor(name, payload, bodies)!, payload }));

/**
 * Register renderers for app body types: `app.use(feedBodies({ 'Acme/Shipment': Shipment }))`.
 * Each install merges into what is already registered, so packages can add their own.
 */
export function feedBodies(bodies: Bodies): Plugin {
    return {
        install(app: App) {
            const registered = app.runWithContext(() => inject(FEED_BODIES, {}));
            app.provide(FEED_BODIES, { ...registered, ...bodies });
        },
    };
}
