// ---------------------------------------------------------------------------
// Message Protocol Types — Clipboard Lokal
// ---------------------------------------------------------------------------
// Defines the WebSocket message protocol shared between Nuxt client and
// Bun server. Types match the spec in .scratch/clipboard-arch/spec.md.
// ---------------------------------------------------------------------------

/**
 * All valid message types in the clipboard protocol.
 */
export const MessageType = {
  Join: 'join',
  Paste: 'paste',
  Sync: 'sync',
  History: 'history',
  Error: 'error',
  FileShared: 'file-shared',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// ---------------------------------------------------------------------------
// Clipboard Entry (stored in Redis)
// ---------------------------------------------------------------------------

/** Metadata for a shared file. */
export interface FileMetadata {
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** Download URL path, e.g. /files/<roomId>/<filename> */
  url: string;
}

/**
 * A single clipboard entry as stored in Redis.
 * Contains text content and a server-generated timestamp.
 * Optionally includes file metadata for file-upload entries.
 */
export interface ClipboardEntry {
  /** The text content (or description for file entries) */
  text: string;
  /** Server-generated timestamp in unix milliseconds */
  ts: number;
  /** File metadata — only present for file-upload entries */
  file?: FileMetadata;
}

// ---------------------------------------------------------------------------
// Message Variants (discriminated union on `type`)
// ---------------------------------------------------------------------------

/** Client → Server: join a room */
export interface JoinMessage {
  type: typeof MessageType.Join;
  roomId: string;
}

/** Client → Server: paste new text into the room */
export interface PasteMessage {
  type: typeof MessageType.Paste;
  roomId: string;
  payload: string;
}

/** Client → Server: request full history re-fetch */
export interface SyncMessage {
  type: typeof MessageType.Sync;
  roomId: string;
}

/** Server → Client: full clipboard history for the room */
export interface HistoryMessage {
  type: typeof MessageType.History;
  roomId: string;
  payload: ClipboardEntry[];
}

/** Server → Client: error notification */
export interface ErrorMessage {
  type: typeof MessageType.Error;
  payload: string;
}

/** Server → Client: a file was uploaded and shared in the room */
export interface FileSharedMessage {
  type: typeof MessageType.FileShared;
  roomId: string;
  payload: ClipboardEntry;
}

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all clipboard protocol messages.
 * Use `message.type` to narrow the variant.
 */
export type ClipboardMessage =
  | JoinMessage
  | PasteMessage
  | SyncMessage
  | HistoryMessage
  | ErrorMessage
  | FileSharedMessage;
