<script setup lang="ts">
import { fallbackOf } from '../../shared/body'

/** A body whose type has no renderer: its `$fallback` line, as plain text. */
defineOptions({ inheritAttrs: false })
defineProps<{ payload: Record<string, any> }>()
</script>

<template>
    <p class="sf-body-fallback m-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">{{ fallbackOf(payload) }}</p>
</template>
