<script setup lang="ts">
import { computed, inject } from 'vue'
import { FEED_LINK, FEED_MEDIA_OBJECT_PLACEMENT } from '../keys'
import FeedMedia from '../FeedMedia.vue'
import { pictureShape } from '../../shared/picture'
import { bodyLink, linkProps, ownLink, type ResolvedLink } from '../../shared/link'

/**
 * `Storyfeed/Body/MediaObject` — the shape of a post: a title line, some
 * prose, one picture, the files it names, and a line of small print.
 *
 * THE DETAIL STORES NO IMAGE. `image` is a slot NAME — icon, preview or image
 * — and the picture is the entity's media for that slot, minted at read time.
 * A row recorded under an old thumbnail conversion draws the current one, and
 * a slot the resolver left empty draws no picture and no placeholder.
 *
 * A supplied subject is always shown. A link without an href uses the owning
 * entity's current URL; a plain string remains unlinked.
 */
const props = defineProps<{
    payload: Record<string, any>
    entityLabel?: string | null
    entityUrl?: string | null
    entityLink?: ResolvedLink | null
    entityMedia?: Record<string, any> | null
    imagePlacement?: 'beside' | 'below'
}>()

const linkComponent = inject(FEED_LINK, 'a')
const defaultPlacement = inject(FEED_MEDIA_OBJECT_PLACEMENT, 'beside')
const placement = computed(() => props.imagePlacement ?? defaultPlacement)

const subject = computed(() => {
    const value = props.payload.subject
    const label = typeof value === 'string' ? value : value?.label

    return label ? { label, link: typeof value === 'string' ? null : bodyLink(value, ownLink(props.entityLink, props.entityUrl)) } : null
})

const files = computed(() => {
    const listed = 'files' in props.payload ? props.payload.files
        : (props.payload.$v ?? 1) < 2 ? props.payload.attachments : []
    return Array.isArray(listed) ? listed : []
})

const picture = computed(() =>
    ['icon', 'preview', 'image'].includes(props.payload.image) ? (props.entityMedia?.[props.payload.image] ?? null) : null,
)

/** Beside the text, a picture keeps its own shape (see `shared/picture.ts`). */
const shape = computed(() => pictureShape(props.payload.image, picture.value))
const frames = {
    icon: { wrapper: 'sf-media-object__image w-16 flex-none', media: 'mt-0! size-16! rounded-md!' },
    ratio: { wrapper: 'sf-media-object__image h-16 w-[calc(--spacing(16)*var(--sf-picture-ratio))] flex-none', media: 'mt-0! size-full! max-w-none! aspect-auto! rounded-md!' },
    free: { wrapper: 'sf-media-object__image w-24 flex-none', media: 'mt-0! w-full! max-w-none! rounded-md! [&_img]:h-auto! [&_img]:max-h-32 [&_img]:object-contain!' },
} as const
const frame = computed(() => frames[shape.value.shape])

const footnote = computed(() => {
    const value = props.payload.footnote

    return typeof value === 'string' ? { label: value, link: null }
        : value ? { label: value.label, link: bodyLink(value, ownLink(props.entityLink, props.entityUrl)) } : null
})
</script>

<template>
    <p v-if="!subject && !payload.content && !picture && !files.length && footnote" class="sf-media-object__footnote mt-0.5 mb-0 text-xs leading-[1.6] text-muted-foreground">
        <component :is="linkComponent" v-if="footnote.link" v-bind="linkProps(footnote.link, linkComponent)" class="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{{ footnote.label }}</component>
        <template v-else>{{ footnote.label }}</template>
    </p>
    <div v-else-if="subject || payload.content || picture || files.length" class="sf-media-object mt-1.5 flex min-w-0 max-w-128 flex-wrap items-start gap-3 rounded-lg border border-border bg-muted p-3">
        <div v-if="picture && placement === 'beside'" :class="frame.wrapper" :style="shape.shape === 'ratio' ? { '--sf-picture-ratio': shape.ratio } : undefined">
            <FeedMedia :image="picture" :class="frame.media" />
        </div>
        <div class="sf-media-object__body flex min-w-0 flex-[1_1_--spacing(48)] flex-col gap-1 [overflow-wrap:anywhere]">
            <p v-if="subject" class="sf-media-object__subject m-0 text-sm font-semibold text-foreground">
                <component :is="linkComponent" v-if="subject.link" v-bind="linkProps(subject.link, linkComponent)">{{ subject.label }}</component>
                <template v-else>{{ subject.label }}</template>
            </p>

            <p v-if="payload.content" class="sf-prose m-0 text-sm leading-[1.6] whitespace-pre-wrap sf-media-object__content line-clamp-3 text-muted-foreground">{{ payload.content }}</p>

            <FeedMedia v-if="picture && placement === 'below'" :image="picture" />

            <ul v-if="files.length" class="sf-media-object__attachments mt-0.5 mb-0 flex list-none flex-col gap-0.5 p-0">
            <li v-for="(file, i) in files ?? []" :key="i" class="sf-file m-0 text-sm text-muted-foreground">
                <component :is="linkComponent" :href="file.href">{{ file.name ?? file.href }}</component>
                <span v-if="file.mediaType"> · {{ file.mediaType }}</span>
            </li>
            </ul>

            <p v-if="footnote" class="sf-media-object__footnote mt-0.5 mb-0 text-xs leading-[1.6] text-muted-foreground">
                <component :is="linkComponent" v-if="footnote.link" v-bind="linkProps(footnote.link, linkComponent)">{{ footnote.label }}</component>
                <template v-else>{{ footnote.label }}</template>
            </p>
        </div>
    </div>
</template>
