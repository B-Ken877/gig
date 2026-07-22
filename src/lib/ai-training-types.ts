// Gig AI Training — TypeScript types
// Ported from interboost-agent-training/src/types.ts

export interface Scenario {
  id: string;
  customerName: string;
  gender: 'male' | 'female';
  issue: string;
  mood: 'angry' | 'frustrated' | 'confused' | 'polite' | 'impatient';
  difficulty: 'easy' | 'medium' | 'hard' | 'very hard';
  context: string;
  knowledgeBase: string;
  script: string;
}

export interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export type AppState =
  | 'IDLE'
  | 'SELECT_CATEGORY'
  | 'SELECT_DIFFICULTY'
  | 'GENERATING_SCENARIO'
  | 'GENERATING_TRANSCRIPT'
  | 'PRACTICING'
  | 'LEARNING'
  | 'TEACHER_SESSION'
  | 'FEEDBACK';

export interface Message {
  speaker: 'Customer' | 'Agent';
  text: string;
}
