<script setup lang="ts">
/** An app body type, registered through `feedBodies()`. */
defineProps<{ payload: Record<string, any> }>();
</script>

<template>
    <p class="sf-shipment m-0 text-base text-foreground [overflow-wrap:anywhere]">{{ payload.carrier ?? '' }} · {{ payload.tracking ?? '' }}</p>
</template>
