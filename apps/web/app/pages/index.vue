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
  <div class="flex flex-col items-center justify-center min-h-[80vh] px-4">
    <div class="glass-panel p-8 md:p-12 max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 text-primary mb-2 ring-1 ring-primary/30">
        <ClipboardCopy :size="32" stroke-width="1.5" />
      </div>
      
      <div class="space-y-2">
        <h1 class="text-3xl font-bold tracking-tight text-white">ClipSync</h1>
        <p class="text-slate-400">Instantly share text across devices.</p>
      </div>
      
      <form @submit.prevent="joinRoom" class="space-y-4 pt-4">
        <div class="relative">
          <input 
            v-model="roomId" 
            type="text" 
            placeholder="Enter a room name"
            required
            class="input-field pl-4 pr-12 text-center text-lg"
          />
        </div>
        
        <button type="submit" class="btn-primary w-full flex items-center justify-center gap-2 group">
          Join Room
          <ArrowRight :size="18" class="group-hover:translate-x-1 transition-transform" />
        </button>
      </form>
    </div>
  </div>
</template>
