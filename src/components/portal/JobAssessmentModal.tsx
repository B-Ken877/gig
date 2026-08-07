'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertCircle, ArrowRight, ArrowLeft, Trophy, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { assessmentSections, type AssessmentQuestion } from '@/lib/assessment-questions';

interface JobAssessmentModalProps {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onComplete: (result: { passed: boolean; score: number; answers: any[] }) => Promise<void>;
}

const PASS_THRESHOLD = 70; // 70% to pass
const QUESTIONS_PER_ASSESSMENT = 10;

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function JobAssessmentModal({ jobId, jobTitle, onClose, onComplete }: JobAssessmentModalProps) {
  const [stage, setStage] = useState<'intro' | 'questions' | 'result'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selected: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);

  // Pick 10 random questions from the question bank across all sections.
  const questions = useMemo<AssessmentQuestion[]>(() => {
    const all = assessmentSections.flatMap(s => s.questions);
    return pickRandom(all, Math.min(QUESTIONS_PER_ASSESSMENT, all.length));
  }, [jobId]);

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + (answers.find(a => a.questionId === currentQ?.id) ? 1 : 0)) / questions.length) * 100;

  const handleSelect = (label: string) => {
    const existing = answers.findIndex(a => a.questionId === currentQ.id);
    if (existing >= 0) {
      const next = [...answers];
      next[existing] = { questionId: currentQ.id, selected: label };
      setAnswers(next);
    } else {
      setAnswers([...answers, { questionId: currentQ.id, selected: label }]);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const correctCount = answers.filter(a => {
      const q = questions.find(qq => qq.id === a.questionId);
      return q && q.correctAnswer === a.selected;
    }).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= PASS_THRESHOLD;

    setResult({ passed, score });
    setStage('result');

    try {
      await onComplete({ passed, score, answers: answers.map(a => ({ ...a, correct: questions.find(q => q.id === a.questionId)?.correctAnswer === a.selected })) });
    } catch (e) {
      console.error('Assessment save failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStage('intro');
    setCurrentIdx(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">Skills Assessment</p>
            <h2 className="text-lg font-bold text-gray-900">{jobTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Intro */}
            {stage === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10">
                    <Trophy className="h-8 w-8 text-[#16A34A]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Begin?</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                    This is a quick skills assessment for <strong>{jobTitle}</strong>.
                    You need to score at least <strong>{PASS_THRESHOLD}%</strong> to apply for this job.
                  </p>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
                    <Card><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{questions.length}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Questions</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">~5 min</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Duration</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-[#16A34A]">{PASS_THRESHOLD}%</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">To Pass</p>
                    </CardContent></Card>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                    <p className="text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>You can retake the assessment if you don&apos;t pass on the first try. Your best score will be saved.</span>
                    </p>
                  </div>

                  <Button className="mt-6 bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={() => setStage('questions')}>
                    Start Assessment <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Questions */}
            {stage === 'questions' && currentQ && (
              <motion.div key="questions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Question {currentIdx + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="space-y-4">
                  <div>
                    <Badge variant="outline" className="text-[10px] uppercase mb-2">{currentQ.category}</Badge>
                    <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{currentQ.question}</h3>
                  </div>

                  <div className="space-y-2">
                    {currentQ.options.map(opt => {
                      const selected = answers.find(a => a.questionId === currentQ.id)?.selected === opt.label;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => handleSelect(opt.label)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-3 ${
                            selected
                              ? 'border-[#16A34A] bg-[#16A34A]/5'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            selected ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {opt.label}
                          </span>
                          <span className="text-sm text-gray-700 pt-0.5">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={handlePrev} disabled={currentIdx === 0}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                  </Button>
                  <Button
                    className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                    onClick={handleNext}
                    disabled={!answers.find(a => a.questionId === currentQ.id) || submitting}
                  >
                    {currentIdx < questions.length - 1 ? (
                      <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
                    ) : submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                    ) : (
                      <>Submit Assessment</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Result */}
            {stage === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-6">
                  {result.passed ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#16A34A]/10"
                      >
                        <CheckCircle2 className="h-12 w-12 text-[#16A34A]" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h3>
                      <p className="text-sm text-gray-600 mb-4">You passed the assessment. Your application has been submitted.</p>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50"
                      >
                        <XCircle className="h-12 w-12 text-red-500" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Almost There!</h3>
                      <p className="text-sm text-gray-600 mb-4">You need {PASS_THRESHOLD}% to pass. Review the material and try again.</p>
                    </>
                  )}

                  <div className="inline-flex items-baseline gap-2 mb-6">
                    <span className={`text-5xl font-bold ${result.passed ? 'text-[#16A34A]' : 'text-red-500'}`}>{result.score}%</span>
                  </div>

                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    {result.passed ? (
                      <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={onClose}>
                        Done
                      </Button>
                    ) : (
                      <>
                        <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={handleRetry}>
                          <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                        </Button>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
