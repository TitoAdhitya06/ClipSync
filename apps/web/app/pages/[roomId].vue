<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useWebSocket, useDocumentVisibility } from '@vueuse/core';
import { ClipboardList, Send, Wifi, WifiOff, Loader2 } from '@lucide/vue';
import { MessageType } from '@clipboard-lokal/shared';
import type { ClipboardMessage, ClipboardEntry, JoinMessage, PasteMessage, SyncMessage, HistoryMessage, ErrorMessage } from '@clipboard-lokal/shared';

const route = useRoute();
const roomId = route.params.roomId as string;
const visibility = useDocumentVisibility();

const entries = ref<ClipboardEntry[]>([]);
const inputText = ref('');
const listContainer = ref<HTMLElement | null>(null);

// Format timestamp
const formatTime = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// WebSocket URL
const wsUrl = computed(() => {
  if (import.meta.client) {
    return `ws://${window.location.hostname}:3001`;
  }
  return '';
});

// Setup WebSocket
const { status, data, send, open, close } = useWebSocket(wsUrl.value, {
  immediate: false,
  autoReconnect: {
    retries: -1,
    delay: (retries) => Math.min(1000 * Math.pow(2, retries), 30000),
    onFailed() {
      console.error('[ws] Auto-reconnect max retries reached');
    },
  },
  heartbeat: {
    message: 'ping',
    interval: 30000,
    pongTimeout: 5000,
  }
});

// Sync on mount
onMounted(() => {
  if (import.meta.client) {
    open();
  }
});

// Handle connection open -> send join or sync
watch(status, (newStatus, oldStatus) => {
  if (newStatus === 'OPEN') {
    if (oldStatus === 'CONNECTING' && entries.value.length === 0) {
      // Initial join
      const joinMsg: JoinMessage = { type: MessageType.Join, roomId };
      send(JSON.stringify(joinMsg));
    } else {
      // Reconnected -> sync to catch up
      const syncMsg: SyncMessage = { type: MessageType.Sync, roomId };
      send(JSON.stringify(syncMsg));
    }
  }
});

// Proactive reconnect on tab wake
watch(visibility, (current) => {
  if (current === 'visible') {
    if (status.value !== 'OPEN' && status.value !== 'CONNECTING') {
      open();
    } else if (status.value === 'OPEN') {
      // Ensure sync just in case messages were missed during sleep
      const syncMsg: SyncMessage = { type: MessageType.Sync, roomId };
      send(JSON.stringify(syncMsg));
    }
  }
});

// Scroll to bottom
const scrollToBottom = async () => {
  await nextTick();
  if (listContainer.value) {
    listContainer.value.scrollTo({
      top: listContainer.value.scrollHeight,
      behavior: 'smooth'
    });
  }
};

// Handle incoming messages
watch(data, (newVal) => {
  if (!newVal || newVal === 'pong') return;
  
  try {
    const msg = JSON.parse(newVal) as ClipboardMessage;
    
    if (msg.type === MessageType.History) {
      entries.value = (msg as HistoryMessage).payload;
      scrollToBottom();
    } else if (msg.type === MessageType.Error) {
      console.error('[ws error]', (msg as ErrorMessage).payload);
    }
  } catch (err) {
    console.error('Failed to parse message', err);
  }
});

// Submit paste
const submitPaste = () => {
  const text = inputText.value.trim();
  if (!text) return;
  
  if (status.value === 'OPEN') {
    const pasteMsg: PasteMessage = {
      type: MessageType.Paste,
      roomId,
      payload: text
    };
    send(JSON.stringify(pasteMsg));
    inputText.value = '';
  }
};
</script>

<template>
  <div class="flex flex-col h-screen max-h-screen">
    <!-- Header -->
    <header class="glass-panel rounded-none! border-x-0! border-t-0! flex items-center justify-between px-4 py-3 shrink-0 z-10">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary/20 text-primary rounded-lg">
          <ClipboardList :size="20" />
        </div>
        <div>
          <h1 class="font-semibold leading-tight text-white">{{ roomId }}</h1>
          <p class="text-xs text-slate-400">Shared Clipboard</p>
        </div>
      </div>
      
      <!-- Connection Status -->
      <div class="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
           :class="{
             'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': status === 'OPEN',
             'bg-amber-500/10 text-amber-400 border border-amber-500/20': status === 'CONNECTING',
             'bg-rose-500/10 text-rose-400 border border-rose-500/20': status === 'CLOSED'
           }">
        <Wifi v-if="status === 'OPEN'" :size="14" />
        <Loader2 v-else-if="status === 'CONNECTING'" :size="14" class="animate-spin" />
        <WifiOff v-else :size="14" />
        <span>{{ status === 'OPEN' ? 'Connected' : status === 'CONNECTING' ? 'Connecting...' : 'Offline' }}</span>
      </div>
    </header>

    <!-- Messages Area -->
    <main ref="listContainer" class="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
      <div v-if="entries.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
        <ClipboardList :size="48" class="opacity-20" />
        <p>No clipboard history yet.</p>
        <p class="text-sm">Paste something below to get started!</p>
      </div>
      
      <div v-for="(entry, idx) in entries" :key="idx" class="glass-panel p-4 animate-in fade-in slide-in-from-bottom-2">
        <div class="flex justify-between items-start mb-2">
          <div class="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded flex items-center">
            {{ formatTime(entry.ts) }}
          </div>
        </div>
        <div class="text-slate-200 whitespace-pre-wrap wrap-break-word leading-relaxed font-mono text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
          {{ entry.text }}
        </div>
      </div>
    </main>

    <!-- Input Area -->
    <footer class="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-slate-900 via-slate-900 to-transparent">
      <div class="max-w-3xl mx-auto w-full">
        <form @submit.prevent="submitPaste" class="glass-panel p-2 flex gap-2 shadow-2xl shadow-black">
          <input 
            v-model="inputText" 
            type="text" 
            placeholder="Type or paste something..."
            class="input-field border-none! bg-transparent! focus:ring-0! flex-1"
            :disabled="status !== 'OPEN'"
            autocomplete="off"
          />
          <button 
            type="submit" 
            class="btn-primary px-4! py-3! flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="status !== 'OPEN' || !inputText.trim()"
          >
            <Send :size="18" class="translate-y-px -translate-x-px" />
          </button>
        </form>
      </div>
    </footer>
  </div>
</template>
