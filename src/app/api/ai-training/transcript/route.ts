// Server-side Gemini learning transcript generation.
// Generates an expert agent transcript for the "Watch AI Solve" mode.
//
// NOTE: This route does NOT call recordSession() — usage is already
// recorded by the /api/ai-training/scenario route (which runs first in
// the "Watch AI Solve" flow). We only call assertCanUse() here as a
// defense-in-depth check in case the scenario route is ever called
// separately. This prevents "Watch AI Solve" from double-counting
// (scenario + transcript = 1 session, not 2).

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { assertCanUse } from '@/lib/ai-training-usage';

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on the server.' },
        { status: 503 },
      );
    }

    // ─── Usage check ────────────────────────────────────────────────────
    try {
      await assertCanUse(req);
    } catch (err: any) {
      const status = err.status || 500;
      let body: any = { error: err.message || 'Usage check failed' };
      try {
        body = JSON.parse(err.message);
      } catch {}
      return NextResponse.json(body, { status });
    }

    const { scenario } = await req.json();
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `Write a complete, realistic customer service transcript where an expert Agent successfully resolves the Customer's issue.
      Customer Name: ${scenario.customerName}
      Issue: ${scenario.issue}
      Mood: ${scenario.mood}
      Context: ${scenario.context}
      Knowledge Base: ${scenario.knowledgeBase}

      The agent must use the knowledge base to solve the problem. The customer should start with their initial mood and gradually become satisfied.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING, enum: ['Customer', 'Agent'] },
              text: { type: Type.STRING },
            },
            required: ['speaker', 'text'],
          },
        },
      },
    });

    // Usage is NOT recorded here — the scenario route already recorded it.
    // (See comment at the top of this file.)

    return NextResponse.json({
      messages: JSON.parse(response.text || '[]'),
    });
  } catch (error: any) {
    console.error('POST /api/ai-training/transcript error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate transcript' },
      { status: 500 },
    );
  }
}
