<script setup lang="ts">
import { MessageType } from '@clipboard-lokal/shared';

// Prove shared types resolve — this log runs client-side
console.log('[web] Message types available:', Object.values(MessageType));
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 selection:bg-primary/30">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
