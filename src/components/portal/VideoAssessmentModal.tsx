'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, CheckCircle2, X, ArrowRight, Video, Square,
  RotateCcw, Send, Camera, AlertCircle, Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import type { JobPost } from '@/lib/types';

interface VideoAssessmentModalProps {
  job: JobPost;
  onClose: () => void;
  onComplete: (result: { videoResponses: { questionIndex: number; questionText: string; videoUrl: string; durationSeconds: number }[] }) => Promise<void>;
}

type Stage = 'intro' | 'preview' | 'recording' | 'reviewing' | 'uploading' | 'done';

export default function VideoAssessmentModal({ job, onClose, onComplete }: VideoAssessmentModalProps) {
  const { currentUser } = useAppStore();
  const questions = job.assessmentQuestions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stage, setStage] = useState<Stage>('intro');
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ questionIndex: number; questionText: string; videoUrl: string; durationSeconds: number }[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('video/webm');
  const [recordingTime, setRecordingTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const progress = ((currentIdx + (stage === 'done' ? 1 : 0)) / questions.length) * 100;

  // ─── Callback ref for the live-preview <video> element ───────────────────
  //
  // This is the KEY fix for the black-screen bug. The preview and recording
  // blocks both render a <video> element with this callback ref. When React
  // mounts a new <video> element (after an AnimatePresence transition), this
  // callback fires immediately — and we re-attach the camera stream right
  // then and there. This is more reliable than a useEffect, which fires
  // *after* the render commit (and after AnimatePresence's exit animation
  // delay), by which point the element might not be ready yet.
  const videoRefCallback = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      element.play().catch(() => {});
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      // Attach to whatever video element is currently mounted.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Could not access your camera. Please allow camera and microphone permissions in your browser settings, then try again.');
    }
  }, []);

  // Helper: re-attach the stream to the current video element.
  const reattachStream = () => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  };

  // ─── Stage transitions ───────────────────────────────────────────────────

  const handleStartAssessment = async () => {
    setStage('preview');
    setTimeout(() => { startCamera(); }, 100);
  };

  const handleStartRecording = () => {
    if (!streamRef.current) {
      setError('Camera is not ready. Please wait a moment and try again.');
      return;
    }
    chunksRef.current = [];
    setRecordingTime(0);

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
      'video/ogg',
    ];
    let mimeType = '';
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
    }
    setRecordedMimeType(mimeType || 'video/webm');

    try {
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: actualType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordedMimeType(actualType);
        setStage('reviewing');
      };

      recorder.start();
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setStage('recording');
      // Re-attach immediately — the callback ref also handles this, but
      // we do it here too for instant feedback.
      setTimeout(reattachStream, 50);
      setTimeout(reattachStream, 200);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRetake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setStage('preview');
    setTimeout(reattachStream, 50);
    setTimeout(reattachStream, 200);
  };

  const handleSubmitResponse = async () => {
    if (!recordedBlob) return;
    setStage('uploading');
    setError(null);

    try {
      const formData = new FormData();

      const mt = recordedMimeType || recordedBlob.type || 'video/webm';
      let ext = 'webm';
      if (mt.includes('mp4')) ext = 'mp4';
      else if (mt.includes('ogg')) ext = 'ogg';
      else ext = 'webm';

      const file = new File([recordedBlob], `response-${currentIdx}.${ext}`, { type: mt });
      formData.append('video', file);
      formData.append('mimeType', mt);

      const res = await fetch('/api/assessments/upload', {
        method: 'POST',
        headers: {
          'X-User-Id': currentUser!.id,
          'X-User-Role': currentUser!.role,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      const durationSeconds = recordingTime;

      const newResponse = {
        questionIndex: currentIdx,
        questionText: currentQuestion,
        videoUrl: data.videoUrl,
        durationSeconds,
      };

      const updatedResponses = [...responses, newResponse];
      setResponses(updatedResponses);

      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedBlob(null);
      setRecordedUrl(null);

      if (isLastQuestion) {
        await onComplete({ videoResponses: updatedResponses });
        stopCamera();
        setStage('done');
      } else {
        setCurrentIdx(currentIdx + 1);
        setRecordingTime(0);
        setStage('preview');
        setTimeout(reattachStream, 50);
        setTimeout(reattachStream, 200);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video. Please try again.');
      setStage('reviewing');
    }
  };

  const handleClose = () => {
    stopCamera();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    onClose();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">Video Assessment</p>
            <h2 className="text-lg font-bold text-gray-900">{job.jobTitle}</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ─── INTRO ─── */}
            {stage === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10">
                    <Video className="h-8 w-8 text-[#16A34A]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Video Assessment</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                    You&apos;ll answer <strong>{questions.length} questions</strong> by recording short video responses.
                    Use your front camera, speak clearly, and be yourself. You can retake any recording before submitting.
                  </p>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
                    <Card><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{questions.length}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Questions</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">~2 min</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Per Answer</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-[#16A34A]">Unlimited</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Retakes</p>
                    </CardContent></Card>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left mb-6">
                    <p className="text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>How it works:</strong> For each question, you&apos;ll see the question and a live camera preview.
                        When you&apos;re ready, click <strong>Start Recording</strong>. You can retake any recording before moving on.
                      </span>
                    </p>
                  </div>

                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={handleStartAssessment}>
                    <Video className="h-4 w-4 mr-2" /> Start Assessment
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── PREVIEW ─── */}
            {stage === 'preview' && currentQuestion && (
              <motion.div key={`preview-${currentIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Question {currentIdx + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="mb-4 p-4 rounded-xl bg-gray-50 border">
                  <Badge variant="outline" className="text-[10px] uppercase mb-2">Question {currentIdx + 1}</Badge>
                  <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{currentQuestion}</h3>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                  <video ref={videoRefCallback} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-gray-800/80 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    <Camera className="h-3.5 w-3.5" /> Camera Preview
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-xs">
                    Ready to record. Click <strong>Start Recording</strong> when you&apos;re ready.
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                    <AlertCircle className="size-4 shrink-0" />{error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    Review the question, then start recording when you&apos;re ready.
                  </div>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleStartRecording}
                    disabled={!streamRef.current}
                  >
                    <span className="h-3 w-3 rounded-full bg-white inline-block mr-2" /> Start Recording
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── RECORDING ─── */}
            {stage === 'recording' && currentQuestion && (
              <motion.div key={`recording-${currentIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Question {currentIdx + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="mb-4 p-4 rounded-xl bg-gray-50 border">
                  <Badge variant="outline" className="text-[10px] uppercase mb-2">Question {currentIdx + 1}</Badge>
                  <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{currentQuestion}</h3>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                  <video ref={videoRefCallback} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    REC {formatTime(recordingTime)}
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-red-400" /> Recording in progress...
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    Speak clearly. Click <strong>Stop Recording</strong> when you&apos;re done.
                  </div>
                  <Button
                    className="bg-gray-800 hover:bg-gray-900 text-white"
                    onClick={handleStopRecording}
                  >
                    <Square className="h-4 w-4 mr-2 fill-current" /> Stop Recording
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── REVIEWING ─── */}
            {stage === 'reviewing' && currentQuestion && recordedUrl && (
              <motion.div key={`reviewing-${currentIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Question {currentIdx + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="mb-4 p-4 rounded-xl bg-gray-50 border">
                  <Badge variant="outline" className="text-[10px] uppercase mb-2">Question {currentIdx + 1}</Badge>
                  <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{currentQuestion}</h3>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                  <video ref={reviewVideoRef} src={recordedUrl} controls autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Review Your Recording
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                    <AlertCircle className="size-4 shrink-0" />{error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    Recorded {formatTime(recordingTime)}. Retake or submit to continue.
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRetake}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Retake
                    </Button>
                    <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={handleSubmitResponse}>
                      {isLastQuestion ? (<><Send className="h-4 w-4 mr-2" /> Submit Application</>) : (<>Submit & Next <ArrowRight className="h-4 w-4 ml-2" /></>)}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── UPLOADING ─── */}
            {stage === 'uploading' && currentQuestion && (
              <motion.div key={`uploading-${currentIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Question {currentIdx + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="mb-4 p-4 rounded-xl bg-gray-50 border">
                  <Badge variant="outline" className="text-[10px] uppercase mb-2">Question {currentIdx + 1}</Badge>
                  <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{currentQuestion}</h3>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4 flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-10 w-10 animate-spin mb-3" />
                  <p className="text-sm">Uploading your response...</p>
                </div>

                <div className="flex items-center justify-center">
                  <p className="text-xs text-gray-500">Please wait while we save your video.</p>
                </div>
              </motion.div>
            )}

            {/* ─── DONE ─── */}
            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#16A34A]/10"
                  >
                    <CheckCircle2 className="h-12 w-12 text-[#16A34A]" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                    Thank you for your video responses. We will review your application and contact you soon.
                    You can track the status of your application from your dashboard.
                  </p>
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={handleClose}>
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
