<script setup lang="ts">
import { MessageType } from '@clipboard-lokal/shared';

// Prove shared types resolve — this log runs client-side
console.log('[web] Message types available:', Object.values(MessageType));
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtWelcome />
  </div>
</template>
