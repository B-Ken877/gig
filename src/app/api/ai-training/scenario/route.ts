// Server-side Gemini scenario generation.
// Proxies the Gemini API call through the VPS (which is not geo-restricted)
// instead of making the call from the user's browser.
// Enforces 3 sessions per 24-hour window per user.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { assertCanUse, recordSession } from '@/lib/ai-training-usage';

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
    // Block if the user has already used 3 sessions in the last 24h.
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

    const { category, difficulty } = await req.json();
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `Generate a unique female customer service scenario for a role-play practice session. The scenario MUST be strictly related to ${category}. The difficulty level of the scenario should be ${difficulty}. Ensure the customer name is female. Also generate a detailed 'knowledgeBase' text that contains all the specific rules, policies, forms, deadlines, or procedures the agent needs to solve this specific issue. Additionally, provide a 'script' that outlines a general step-by-step guide or flow the agent should follow to solve the case (not the exact words, but the structural steps).

      CRITICAL: Format BOTH the 'knowledgeBase' and 'script' using rich Markdown formatting (use headings like ##, bold text **, bullet points -, numbered lists 1., blockquotes >, etc.) to make them highly readable and well-structured.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING, description: 'A female name' },
            gender: { type: Type.STRING, enum: ['female'] },
            issue: {
              type: Type.STRING,
              description: `A customer service issue related to ${category}`,
            },
            mood: {
              type: Type.STRING,
              enum: ['angry', 'frustrated', 'confused', 'polite', 'impatient'],
            },
            difficulty: {
              type: Type.STRING,
              enum: ['easy', 'medium', 'hard', 'very hard'],
            },
            context: { type: Type.STRING, description: 'Background info for the agent' },
            knowledgeBase: {
              type: Type.STRING,
              description:
                'A detailed text document containing rules, forms, and procedures needed to solve the issue. MUST BE FORMATTED IN MARKDOWN.',
            },
            script: {
              type: Type.STRING,
              description:
                'A general step-by-step script or flow the agent should follow to resolve the scenario. MUST BE FORMATTED IN MARKDOWN.',
            },
          },
          required: [
            'customerName',
            'gender',
            'issue',
            'mood',
            'difficulty',
            'context',
            'knowledgeBase',
            'script',
          ],
        },
      },
    });

    // ─── Record usage ───────────────────────────────────────────────────
    // Only record after a successful generation (so a failed API call
    // doesn't burn the user's quota).
    let usage = null;
    try {
      usage = await recordSession(req);
    } catch (e) {
      // Non-fatal — usage tracking failed but the scenario was generated.
      console.error('Failed to record AI training usage:', e);
    }

    const data = JSON.parse(response.text || '{}');
    return NextResponse.json({
      ...data,
      id: Math.random().toString(36).substring(7),
      _usage: usage,
    });
  } catch (error: any) {
    console.error('POST /api/ai-training/scenario error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate scenario' },
      { status: 500 },
    );
  }
}
