import type { Component } from 'vue'
import KeyValue from './KeyValue.vue'
import ComponentBody from './ComponentBody.vue'
import Excerpt from './Excerpt.vue'
import FileAttachment from './FileAttachment.vue'
import Prose from './Prose.vue'
import ItemList from './ItemList.vue'
import Image from './Image.vue'
import MediaObject from './MediaObject.vue'

/**
 * The body forms this kit draws, by the name a row carries.
 *
 * The map is the whole mechanism: a renderer finds `$body` inside the app's
 * own `data`, looks the name up here, and draws nothing when it does not
 * recognise it — the same rule the read path applies to an unknown verb. The
 * names are core's vocabulary (`Storyfeed\Body`), matched EXACTLY, so the
 * casing is part of the name.
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

import { formsIn as discover, resolve as resolveBodies } from '../../shared/body';
export { imageOf } from '../../shared/body';
export type ResolvedDetail = { component: Component; payload: Record<string, any> };
export const formsIn = (data: unknown, depth = 4): ResolvedDetail[] =>
    discover(data, depth).map(({ name, payload }) => ({ component: FORMS[name], payload }));
export const resolve = (body: unknown): ResolvedDetail[] =>
    resolveBodies(body).map(({ name, payload }) => ({ component: FORMS[name], payload }));
