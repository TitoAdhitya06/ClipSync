/**
 * Message protocol type definitions for ClipSync.
 * Shared between the Nuxt client and Bun WebSocket server.
 */

/**
 * Message type identifiers for clipboard operations and events.
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

/**
 * Metadata for a shared file.
 */
export interface FileMetadata {
  /** Original file name. */
  name: string;
  /** File size in bytes. */
  size: number;
  /** Download URL path, for example /files/{roomId}/{filename}. */
  url: string;
}

/**
 * Clipboard entry stored in Redis.
 * Contains text content and server timestamp, with optional file metadata.
 */
export interface ClipboardEntry {
  /** Text content or file descriptor. */
  text: string;
  /** Server timestamp in Unix milliseconds. */
  ts: number;
  /** File metadata for file upload entries. */
  file?: FileMetadata;
}

/**
 * Sent by client to join a specific room.
 */
export interface JoinMessage {
  type: typeof MessageType.Join;
  roomId: string;
}

/**
 * Sent by client to add new text to the room clipboard.
 */
export interface PasteMessage {
  type: typeof MessageType.Paste;
  roomId: string;
  payload: string;
}

/**
 * Sent by client to request full room history synchronization.
 */
export interface SyncMessage {
  type: typeof MessageType.Sync;
  roomId: string;
}

/**
 * Sent by server containing the clipboard history for the room.
 */
export interface HistoryMessage {
  type: typeof MessageType.History;
  roomId: string;
  payload: ClipboardEntry[];
}

/**
 * Sent by server when an error occurs.
 */
export interface ErrorMessage {
  type: typeof MessageType.Error;
  payload: string;
}

/**
 * Sent by server when a file is uploaded and shared in the room.
 */
export interface FileSharedMessage {
  type: typeof MessageType.FileShared;
  roomId: string;
  payload: ClipboardEntry;
}

/**
 * Discriminated union of all clipboard protocol messages.
 */
export type ClipboardMessage =
  | JoinMessage
  | PasteMessage
  | SyncMessage
  | HistoryMessage
  | ErrorMessage
  | FileSharedMessage;

