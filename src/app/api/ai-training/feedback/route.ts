// Server-side Gemini feedback generation.
// Evaluates a practice session transcript and returns a score + feedback.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on the server.' },
        { status: 503 },
      );
    }

    const { transcript, scenario } = await req.json();
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `Evaluate the following customer service interaction.
      Scenario: ${JSON.stringify(scenario)}
      Transcript: ${transcript}

      Provide a score (0-100), strengths, areas for improvement, and a summary.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
          },
          required: ['score', 'strengths', 'improvements', 'summary'],
        },
      },
    });

    return NextResponse.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('POST /api/ai-training/feedback error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate feedback' },
      { status: 500 },
    );
  }
}
