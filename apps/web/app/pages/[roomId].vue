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
    <header class="glass-panel shrink-0 z-10 flex items-center justify-between px-5 py-3.5" style="border-radius: 0; border-left: none; border-right: none; border-top: none;">
      <div class="flex items-center gap-3">
        <div class="gradient-icon p-2.5">
          <ClipboardList :size="20" />
        </div>
        <div>
          <h1 class="font-bold text-lg leading-tight text-text-primary">{{ roomId }}</h1>
          <p class="text-xs text-text-muted font-medium">Shared Clipboard</p>
        </div>
      </div>
      
      <!-- Connection Status & Share -->
      <div class="flex items-center gap-2.5">
        <button 
          @click="showQrModal = true"
          class="icon-btn"
          title="Share Room"
        >
          <QrCode :size="18" />
        </button>
        <div class="status-badge"
             :class="{
               'status-connected': status === 'OPEN',
               'status-connecting': status === 'CONNECTING',
               'status-offline': status === 'CLOSED'
             }">
          <Wifi v-if="status === 'OPEN'" :size="14" class="pulse-dot" />
          <Loader2 v-else-if="status === 'CONNECTING'" :size="14" class="animate-spin" />
          <WifiOff v-else :size="14" />
          <span>{{ status === 'OPEN' ? 'Connected' : status === 'CONNECTING' ? 'Connecting...' : 'Offline' }}</span>
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <main ref="listContainer" class="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
      <!-- Empty State -->
      <div v-if="entries.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <ClipboardList :size="28" />
        </div>
        <p class="text-base font-medium text-text-secondary">No clipboard history yet</p>
        <p class="text-sm">Paste something below to get started!</p>
      </div>
      
      <!-- Entry Cards -->
      <div v-for="(entry, idx) in entries" :key="idx" class="entry-card">
        <!-- Time Badge -->
        <div class="flex justify-between items-start mb-2.5">
          <div class="time-badge">
            {{ formatTime(entry.ts) }}
          </div>
        </div>
        
        <!-- File Entry -->
        <div v-if="entry.file" class="file-card">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="file-icon-wrap">
              <FileIcon :size="18" />
            </div>
            <div class="truncate">
              <p class="text-text-primary font-semibold truncate text-sm">{{ entry.file.name }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ formatSize(entry.file.size) }}</p>
            </div>
          </div>
          <a :href="`${httpUrl}${entry.file.url}`" target="_blank" download class="download-btn">
            <Download :size="18" />
          </a>
        </div>

        <!-- Text Entry -->
        <div v-else class="content-block">{{ entry.text }}</div>
      </div>
    </main>

    <!-- Input Area -->
    <footer class="fixed bottom-0 left-0 right-0 p-4 z-20" style="background: linear-gradient(to top, var(--color-base) 60%, transparent);">
      <div class="max-w-3xl mx-auto w-full">
        <form @submit.prevent="submitPaste" class="glass-panel p-2 flex gap-2 items-center" style="border-radius: 1.25rem; box-shadow: 0 -4px 24px rgba(99,102,241,0.08), 0 8px 32px rgba(0,0,0,0.06);">
          <input type="file" ref="fileInput" class="hidden" @change="uploadFile" />
          
          <!-- Attach Button -->
          <button 
            type="button" 
            @click="triggerFileUpload"
            class="icon-btn shrink-0"
            :disabled="status !== 'OPEN' || isUploading"
            title="Upload file (Max 50MB)"
          >
            <Loader2 v-if="isUploading" :size="20" class="animate-spin" />
            <Paperclip v-else :size="20" />
          </button>
          
          <!-- Text Input -->
          <input 
            v-model="inputText" 
            type="text" 
            placeholder="Type or paste something..."
            class="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted py-2.5 px-1 text-[0.9375rem]"
            :disabled="status !== 'OPEN'"
            autocomplete="off"
          />
          
          <!-- Send Button -->
          <button 
            type="submit" 
            class="send-btn"
            :disabled="status !== 'OPEN' || !inputText.trim()"
          >
            <Send :size="18" class="translate-y-px -translate-x-px" />
          </button>
        </form>
      </div>
    </footer>

    <!-- QR Code Modal -->
    <div v-if="showQrModal" class="modal-overlay" @click="showQrModal = false">
      <div class="modal-card flex flex-col items-center" @click.stop>
        <!-- Close Button -->
        <button @click="showQrModal = false" class="icon-btn absolute top-3 right-3">
          <X :size="20" />
        </button>
        
        <!-- Modal Header -->
        <div class="gradient-icon p-3 mb-4">
          <QrCode :size="26" />
        </div>
        <h2 class="text-xl font-bold text-text-primary mb-1.5 text-center">Share Room</h2>
        <p class="text-text-secondary text-sm text-center mb-6">Scan this QR code to join on another device.</p>
        
        <!-- Localhost Warning -->
        <div v-if="currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')" class="warning-banner mb-5 w-full">
          <strong>Warning:</strong> You are using localhost. Other devices won't be able to connect. Use your Wi-Fi IP address instead.
        </div>

        <!-- QR Code -->
        <div class="bg-white p-5 rounded-2xl shadow-sm mb-6">
          <qrcode-vue :value="currentUrl" :size="200" level="M" />
        </div>
        
        <!-- URL Display -->
        <div class="url-display w-full">
          <span class="text-text-secondary text-sm font-mono truncate select-all flex-1">{{ currentUrl }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
