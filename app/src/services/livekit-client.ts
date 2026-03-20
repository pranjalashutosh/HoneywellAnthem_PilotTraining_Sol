// T6.7 — LiveKit client service
// connectToRoom, publishMicTrack, subscribe to agent audio,
// data channel send/receive, disconnect

import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  ConnectionState,
} from 'livekit-client';

// Data channel message types (browser → agent)
export const MSG_PTT_START = 'PTT_START';
export const MSG_PTT_END = 'PTT_END';
export const MSG_SET_KEYWORDS = 'SET_KEYWORDS';
export const MSG_ATC_INSTRUCTION = 'ATC_INSTRUCTION';

// Data channel message types (agent → browser)
export const MSG_INTERIM_TRANSCRIPT = 'INTERIM_TRANSCRIPT';
export const MSG_FINAL_TRANSCRIPT = 'FINAL_TRANSCRIPT';
export const MSG_ATC_SPEAK_END = 'ATC_SPEAK_END';
export const MSG_ASSESSMENT_RESULT = 'ASSESSMENT_RESULT';
export const MSG_BASELINE_UPDATE = 'BASELINE_UPDATE';

export interface DataChannelMessage {
  type: string;
  payload: Record<string, unknown>;
}

export type DataChannelHandler = (message: DataChannelMessage) => void;

let room: Room | null = null;
let dataHandler: DataChannelHandler | null = null;

export function getRoom(): Room | null {
  return room;
}

export function isConnected(): boolean {
  return room?.state === ConnectionState.Connected;
}

export async function connectToRoom(
  url: string,
  token: string,
  onDataMessage?: DataChannelHandler,
): Promise<Room> {
  if (room && room.state === ConnectionState.Connected) {
    return room;
  }

  room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  if (onDataMessage) {
    dataHandler = onDataMessage;
  }

  // Listen for data messages from agent
  room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
    try {
      const message = JSON.parse(new TextDecoder().decode(data)) as DataChannelMessage;
      console.info('[livekit] Data received:', message.type);
      dataHandler?.(message);
    } catch {
      console.warn('[livekit] Invalid data channel message');
    }
  });

  // Listen for agent audio tracks — this is how ATC voice reaches the speaker
  room.on(RoomEvent.TrackSubscribed, (...args: unknown[]) => {
    const track = args[0] as RemoteTrack;
    const publication = args[1] as { trackName?: string };
    const participant = args[2] as { identity?: string };

    console.info(
      '[livekit] TrackSubscribed: kind=%s, name=%s, from=%s',
      track.kind === Track.Kind.Audio ? 'audio' : 'video',
      publication?.trackName ?? 'unknown',
      participant?.identity ?? 'unknown',
    );

    if (track.kind === Track.Kind.Audio) {
      // Remove any previously attached ATC audio element
      const existing = document.getElementById('atc-audio');
      if (existing) {
        console.info('[livekit] Removing previous atc-audio element');
        existing.remove();
      }

      const element = track.attach();
      element.id = 'atc-audio';
      element.volume = 1.0;
      document.body.appendChild(element);
      console.info('[livekit] ATC audio element attached to DOM (volume=1.0)');

      // Handle browser autoplay policy — if the element is paused, try to play
      if (element.paused) {
        element.play().then(() => {
          console.info('[livekit] ATC audio element play() succeeded');
        }).catch((err) => {
          console.warn('[livekit] ATC audio autoplay blocked:', err.message,
            '— will retry on next user interaction');
          // Resume on next user interaction (click/keypress)
          const resumeAudio = () => {
            element.play().then(() => {
              console.info('[livekit] ATC audio resumed after user interaction');
            }).catch(() => { /* ignore */ });
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
          };
          document.addEventListener('click', resumeAudio, { once: true });
          document.addEventListener('keydown', resumeAudio, { once: true });
        });
      }
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (...args: unknown[]) => {
    const track = args[0] as RemoteTrack;
    console.info('[livekit] TrackUnsubscribed: kind=%s',
      track.kind === Track.Kind.Audio ? 'audio' : 'video');
    track.detach().forEach((el) => el.remove());
  });

  // Log connection state changes
  room.on(RoomEvent.ConnectionStateChanged, (...args: unknown[]) => {
    const state = args[0] as string;
    console.info('[livekit] Connection state changed:', state);
  });

  console.info('[livekit] Connecting to room at', url);
  await room.connect(url, token);
  console.info('[livekit] Connected to room successfully');
  return room;
}

export async function publishMicTrack(): Promise<void> {
  if (!room) {
    throw new Error('Not connected to a room');
  }

  await room.localParticipant.setMicrophoneEnabled(true);
}

export async function unpublishMicTrack(): Promise<void> {
  if (!room) return;

  await room.localParticipant.setMicrophoneEnabled(false);
}

export async function sendDataMessage(type: string, payload: Record<string, unknown>): Promise<void> {
  if (!room || room.state !== ConnectionState.Connected) {
    console.warn('[livekit] Cannot send %s: not connected (state=%s)', type, room?.state ?? 'no room');
    return;
  }

  const message: DataChannelMessage = { type, payload };
  const data = new TextEncoder().encode(JSON.stringify(message));

  console.info('[livekit] Sending data message:', type);
  await room.localParticipant.publishData(data, {
    reliable: true,
  });
}

export function setDataHandler(handler: DataChannelHandler): void {
  dataHandler = handler;
}

export async function disconnect(): Promise<void> {
  if (!room) return;

  // Remove any attached audio elements
  const atcAudio = document.getElementById('atc-audio');
  if (atcAudio) {
    atcAudio.remove();
  }

  await room.disconnect();
  room = null;
  dataHandler = null;
}

// ─── Convenience senders ────────────────────────────────────

export function sendPTTStart(): void {
  void sendDataMessage(MSG_PTT_START, { timestamp: Date.now() / 1000 });
}

export function sendPTTEnd(): void {
  void sendDataMessage(MSG_PTT_END, { timestamp: Date.now() / 1000 });
}

export function sendSetKeywords(keywords: string[]): void {
  void sendDataMessage(MSG_SET_KEYWORDS, { keywords });
}

export async function sendATCInstruction(text: string, expectedReadback: string): Promise<void> {
  await sendDataMessage(MSG_ATC_INSTRUCTION, {
    text,
    expectedReadback,
    atcCallsign: '',
  });
}

export const MSG_SET_BASELINE = 'SET_BASELINE';

export function sendBaseline(baseline: Record<string, unknown>): void {
  void sendDataMessage(MSG_SET_BASELINE, { baselineData: baseline });
}
