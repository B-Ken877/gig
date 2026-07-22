// Server-side Gemini TTS (text-to-speech).
// Generates audio for the "Watch AI Solve" mode playback.
// Returns base64 PCM audio data (24kHz, 16-bit, mono).

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on the server.' },
        { status: 503 },
      );
    }

    const { text, voiceName } = await req.json();
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
          },
        },
      },
    });

    const audioData =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    return NextResponse.json({ audio: audioData });
  } catch (error: any) {
    console.error('POST /api/ai-training/tts error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate audio' },
      { status: 500 },
    );
  }
}
