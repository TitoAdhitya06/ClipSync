<script setup lang="ts">
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Animated gradient orbs -->
    <div class="orb orb-1" aria-hidden="true"></div>
    <div class="orb orb-2" aria-hidden="true"></div>
    <div class="orb orb-3" aria-hidden="true"></div>

    <!-- Content layer -->
    <div class="relative z-10 min-h-screen">
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </div>
  </div>
</template>
