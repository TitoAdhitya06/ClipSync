<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useWebSocket, useDocumentVisibility } from '@vueuse/core';
import { ClipboardList, Send, Wifi, WifiOff, Loader2, Paperclip, File as FileIcon, Download, QrCode, X } from '@lucide/vue';
import QrcodeVue from 'qrcode.vue';
import { MessageType } from '@clipboard-lokal/shared';
import type { ClipboardMessage, ClipboardEntry, JoinMessage, PasteMessage, SyncMessage, HistoryMessage, ErrorMessage } from '@clipboard-lokal/shared';

const route = useRoute();
const roomId = route.params.roomId as string;
const visibility = useDocumentVisibility();

const entries = ref<ClipboardEntry[]>([]);
const inputText = ref('');
const listContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const showQrModal = ref(false);
const currentUrl = ref('');

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

// HTTP URL for file uploads/downloads
const httpUrl = computed(() => {
  return wsUrl.value.replace('ws://', 'http://').replace('wss://', 'https://');
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
    currentUrl.value = window.location.href;
    open();
    
    // Automatically replace localhost with local IP for QR code
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      fetch(`${httpUrl.value}/ip`)
        .then(res => res.json())
        .then(data => {
          if (data.ip && data.ip !== 'localhost') {
            currentUrl.value = currentUrl.value.replace(window.location.hostname, data.ip);
          }
        })
        .catch(err => console.error('Failed to get local IP', err));
    }
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

const triggerFileUpload = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const uploadFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  
  const file = target.files[0];
  if (!file) return;

  if (file.size > 50 * 1024 * 1024) {
    alert('File size exceeds 50MB limit');
    target.value = '';
    return;
  }
  
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('roomId', roomId);
    formData.append('file', file);
    
    const response = await fetch(`${httpUrl.value}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    target.value = ''; // Reset input
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Failed to upload file');
  } finally {
    isUploading.value = false;
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      
      <!-- Connection Status & Share -->
      <div class="flex items-center gap-3">
        <button 
          @click="showQrModal = true"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Share Room"
        >
          <QrCode :size="18" />
        </button>
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
        
        <div v-if="entry.file" class="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="p-2 bg-indigo-500/20 text-indigo-400 rounded">
              <FileIcon :size="20" />
            </div>
            <div class="truncate">
              <p class="text-slate-200 font-medium truncate">{{ entry.file.name }}</p>
              <p class="text-xs text-slate-500 mt-0.5">{{ formatSize(entry.file.size) }}</p>
            </div>
          </div>
          <a :href="`${httpUrl}${entry.file.url}`" target="_blank" download class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0">
            <Download :size="18" />
          </a>
        </div>
        <div v-else class="text-slate-200 whitespace-pre-wrap wrap-break-word leading-relaxed font-mono text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
          {{ entry.text }}
        </div>
      </div>
    </main>

    <!-- Input Area -->
    <footer class="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-slate-900 via-slate-900 to-transparent">
      <div class="max-w-3xl mx-auto w-full">
        <form @submit.prevent="submitPaste" class="glass-panel p-2 flex gap-2 shadow-2xl shadow-black relative">
          <input type="file" ref="fileInput" class="hidden" @change="uploadFile" />
          <button 
            type="button" 
            @click="triggerFileUpload"
            class="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
            :disabled="status !== 'OPEN' || isUploading"
            title="Upload file (Max 50MB)"
          >
            <Loader2 v-if="isUploading" :size="20" class="animate-spin" />
            <Paperclip v-else :size="20" />
          </button>
          
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

    <!-- QR Code Modal -->
    <div v-if="showQrModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click="showQrModal = false">
      <div class="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center relative animate-in fade-in zoom-in-95 duration-200" @click.stop>
        <button @click="showQrModal = false" class="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <X :size="20" />
        </button>
        
        <div class="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl mb-4">
          <QrCode :size="28" />
        </div>
        <h2 class="text-xl font-bold text-white mb-2 text-center">Share Room</h2>
        <p class="text-slate-400 text-sm text-center mb-6">Scan this QR code to join this clipboard room on another device.</p>
        
        <div class="bg-white p-4 rounded-xl shadow-inner mb-6">
          <qrcode-vue :value="currentUrl" :size="200" level="M" />
        </div>
        
        <div class="w-full bg-slate-950 rounded-lg p-3 flex items-center justify-between gap-3 border border-slate-800">
          <span class="text-slate-300 text-sm font-mono truncate select-all">{{ currentUrl }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
