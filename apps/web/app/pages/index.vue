<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, ClipboardCopy } from '@lucide/vue';

const router = useRouter();
const roomId = ref('');

const joinRoom = () => {
  if (roomId.value.trim()) {
    router.push(`/${roomId.value.trim()}`);
  }
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[90vh] px-4">
    <div class="glass-panel p-8 md:p-12 max-w-md w-full text-center space-y-8 page-enter">
      
      <!-- Gradient Icon -->
      <div class="gradient-icon w-20 h-20 mx-auto">
        <ClipboardCopy :size="36" stroke-width="1.5" />
      </div>
      
      <!-- Title & Subtitle -->
      <div class="space-y-3">
        <h1 class="text-4xl font-extrabold tracking-tight text-text-primary">
          Clip<span class="bg-gradient-to-r from-accent via-accent-light to-accent-pink bg-clip-text text-transparent">Sync</span>
        </h1>
        <p class="text-text-secondary text-base">
          Share text and files across devices instantly, without setup.
        </p>
      </div>
      
      <!-- Join Form -->
      <form @submit.prevent="joinRoom" class="space-y-4 pt-2">
        <div class="relative">
          <input 
            v-model="roomId" 
            type="text" 
            placeholder="Enter a room name"
            required
            class="input-field text-center text-lg"
          />
        </div>
        
        <button type="submit" class="btn-primary w-full flex items-center justify-center gap-2 group text-base">
          Join Room
          <ArrowRight :size="18" class="group-hover:translate-x-1 transition-transform" />
        </button>
      </form>
      
      <!-- Hint -->
      <p class="text-xs text-text-muted">
        Same room name = same clipboard. It's that simple.
      </p>
    </div>
  </div>
</template>
