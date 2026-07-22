// Client-side service for Gig AI Training.
// Calls server-side API routes (which proxy to Gemini from the VPS)
// instead of using the Gemini SDK directly from the browser.
//
// This avoids geo-restriction errors: the Gemini API call originates
// from the VPS IP (allowed) rather than the user's browser (may be blocked).
//
// Uses authFetch (from the Zustand store) so the X-User-Id / X-User-Role
// headers are automatically attached — the server-side routes need these
// to identify the user for usage tracking + rate limiting.

import type { Scenario, Feedback, Message } from './ai-training-types';
import { authFetch } from './store';

class ConfigurationError extends Error {
  constructor() {
    super('GEMINI_API_KEY_NOT_CONFIGURED');
    this.name = 'ConfigurationError';
  }
}

// The server-side API routes always use the server's GEMINI_API_KEY.
// We check NEXT_PUBLIC_GEMINI_API_KEY only as a signal that the feature
// is configured (the actual key is read server-side).
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export function isGeminiConfigured(): boolean {
  return !!API_KEY;
}

export async function generateScenario(
  category: string = 'Customer Service',
  difficulty: string = 'medium',
): Promise<Scenario> {
  const res = await authFetch('/api/ai-training/scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate scenario');
  }
  return res.json();
}

export async function getFeedback(
  transcript: string,
  scenario: Scenario,
): Promise<Feedback> {
  const res = await authFetch('/api/ai-training/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, scenario }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate feedback');
  }
  return res.json();
}

export async function generateLearningTranscript(
  scenario: Scenario,
): Promise<Message[]> {
  const res = await authFetch('/api/ai-training/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate transcript');
  }
  const data = await res.json();
  // The route returns { messages, _usage } — extract the messages array.
  return data.messages || data;
}

export async function generateTTS(
  text: string,
  voiceName: string,
): Promise<string> {
  const res = await authFetch('/api/ai-training/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate audio');
  }
  const data = await res.json();
  return data.audio || '';
}

// Re-export ConfigurationError for components that catch it
export { ConfigurationError };

// Re-export GoogleGenAI, Modality, Type, LiveServerMessage from @google/genai
// for the Live voice session components (LiveVoiceSession.tsx, LiveTeacherSession.tsx).
// These components need the Gemini SDK directly because the Live API uses a
// WebSocket connection from the browser that can't be proxied through a
// Next.js API route. If the user's browser is in a geo-restricted region,
// the Live voice features will fail — but the text-based features (scenario,
// feedback, transcript, TTS) work via the server-side API routes above.
export { GoogleGenAI, Modality, Type } from '@google/genai';
export type { LiveServerMessage } from '@google/genai';
