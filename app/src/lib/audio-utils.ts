// T7.3 — Audio level monitoring from LiveKit SDK for PTT visual feedback
// No custom DSP — all voice analysis in Python agent
// For real-time VU meter, use the useAudioLevel hook instead

import { Track } from 'livekit-client';
import { getRoom } from '@/services/livekit-client';

/**
 * Get the current audio level of the local participant's microphone.
 * Uses LiveKit's built-in audioLevel property on LocalTrackPublication.
 * Returns 0-1 normalized level, or 0 if not connected.
 */
export function getLocalAudioLevel(): number {
  const room = getRoom();
  if (!room) return 0;

  const localParticipant = room.localParticipant;
  const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);

  if (!micPub || !micPub.track) return 0;

  // Use the participant's audioLevel which LiveKit updates internally
  return localParticipant.audioLevel ?? 0;
}

/**
 * Subscribe to audio level changes for PTT visual feedback.
 * Returns an unsubscribe function.
 * For a full VU meter, use the useAudioLevel hook with Web Audio API instead.
 */
export function subscribeAudioLevel(
  callback: (level: number) => void,
): () => void {
  let active = true;

  const poll = () => {
    if (!active) return;
    callback(getLocalAudioLevel());
    requestAnimationFrame(poll);
  };

  requestAnimationFrame(poll);

  return () => {
    active = false;
  };
}
