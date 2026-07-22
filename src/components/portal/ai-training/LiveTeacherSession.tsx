'use client';
// Live Teacher Session — real-time voice coaching with an AI instructor.
// Uses Gemini Live API (requires NEXT_PUBLIC_GEMINI_API_KEY + microphone access).
// Ported from interboost-agent-training, restyled with gig-solutions palette.

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GoogleGenAI,
  Modality,
  ConfigurationError,
} from '@/lib/gemini-service';
import type { LiveServerMessage } from '@google/genai';

interface Props {
  onEnd: () => void;
}

export default function LiveTeacherSession({ onEnd }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isManuallyMuted, setIsManuallyMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const lastSpeakerRef = useRef<'Teacher' | 'You' | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isAiSpeakingRef = useRef(false);
  const isManuallyMutedRef = useRef(false);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setAiSpeakingState = (speaking: boolean) => {
    setIsAiSpeaking(speaking);
    isAiSpeakingRef.current = speaking;
  };

  const toggleMute = () => {
    const newState = !isManuallyMuted;
    setIsManuallyMuted(newState);
    isManuallyMutedRef.current = newState;
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    setError(null);
    startSession();
  };

  const startSession = async () => {
    try {
      await startAudioCapture();

      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-preview-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
          },
          systemInstruction: `You are an expert customer support coach and teacher.
          Your job is to teach the user how to be a world-class customer support agent.

          CRITICAL INSTRUCTIONS:
          - Have a live, interactive conversation with the user.
          - Teach them frameworks (like empathy, active listening, de-escalation, clear communication).
          - Do mini role-plays where you act as a difficult customer and they practice their skills.
          - Give them constructive, encouraging feedback immediately after they try.
          - Speak at a natural, conversational human pace.
          - Be encouraging, professional, and highly knowledgeable.
          - Guide the conversation, ask them questions, and make it an interactive learning experience.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            sessionPromise.then((session) => {
              session.sendRealtimeInput({
                text: "Hello! I'm ready to start the coaching session. Please introduce yourself and tell me what we're going to learn today.",
              });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
              }
            }

            if (message.serverContent?.outputTranscription?.text) {
              const text = message.serverContent.outputTranscription.text;
              const prefix =
                lastSpeakerRef.current === 'Teacher' ? '' : '\nTeacher: ';
              transcriptRef.current += `${prefix}${text}`;
              setTranscript((prev) => prev + `${prefix}${text}`);
              lastSpeakerRef.current = 'Teacher';
            } else if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                  const prefix =
                    lastSpeakerRef.current === 'Teacher' ? '' : '\nTeacher: ';
                  transcriptRef.current += `${prefix}${part.text}`;
                  setTranscript((prev) => prev + `${prefix}${part.text}`);
                  lastSpeakerRef.current = 'Teacher';
                }
              }
            }

            if (message.serverContent?.inputTranscription?.text) {
              const text = message.serverContent.inputTranscription.text;
              const prefix =
                lastSpeakerRef.current === 'You' ? '' : '\nYou: ';
              transcriptRef.current += `${prefix}${text}`;
              setTranscript((prev) => prev + `${prefix}${text}`);
              lastSpeakerRef.current = 'You';
            }
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError('Connection error. Please try again.');
          },
          onclose: () => {
            setIsConnected(false);
          },
        },
      });

      const session = await sessionPromise;
      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to connect:', err);
      if (err instanceof ConfigurationError) {
        setError(
          'Gemini API key not configured. Set NEXT_PUBLIC_GEMINI_API_KEY to use AI coaching.',
        );
      } else {
        setError('Failed to start coaching session.');
      }
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        if (isAiSpeakingRef.current || isManuallyMutedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }

        const base64Data = btoa(
          String.fromCharCode(...new Uint8Array(pcmData.buffer)),
        );

        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' },
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access failed:', err);
      setError(
        'Microphone access denied. Please allow microphone access in your browser settings and try again.',
      );
      throw err;
    }
  };

  const playAudioChunk = (base64Data: string) => {
    if (!audioContextRef.current) return;

    setAiSpeakingState(true);

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    const buffer = audioContextRef.current.createBuffer(
      1,
      floatData.length,
      24000,
    );
    buffer.getChannelData(0).set(floatData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    const timeUntilEnd = Math.max(
      0,
      (nextStartTimeRef.current - audioContextRef.current.currentTime) * 1000,
    );
    playbackTimeoutRef.current = setTimeout(() => {
      setAiSpeakingState(false);
    }, timeUntilEnd);
  };

  const stopSession = () => {
    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  };

  const handleEndCall = () => {
    stopSession();
    onEnd();
  };

  // ─── 5-minute session timer ──────────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState(300);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasStarted) return;
    setTimeRemaining(300);
    sessionTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
          stopSession();
          onEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [hasStarted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full p-2 sm:p-4 bg-[#0B1A2E] rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10">
      {!hasStarted ? (
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#16A34A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-[#16A34A]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Ready for Coaching?
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Click the button below to allow microphone access and connect to
            your AI Coach.
          </p>
          <button
            onClick={handleStart}
            className="px-6 py-3 sm:px-8 sm:py-4 bg-[#16A34A] hover:bg-[#0F7B35] text-white rounded-xl font-bold text-sm sm:text-base transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-[#16A34A]/25"
          >
            Start Coaching Session
          </button>
          {error && (
            <p className="text-red-400 mt-4 text-xs max-w-xs mx-auto">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="text-center mb-2 sm:mb-4 shrink-0">
            <h2 className="text-base sm:text-xl font-bold text-white mb-1 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#16A34A]" />
              Live AI Coach
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? isAiSpeaking
                      ? 'bg-[#16A34A] animate-pulse'
                      : isManuallyMuted
                        ? 'bg-gray-500'
                        : 'bg-[#16A34A] animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-mono">
                {isConnected
                  ? isAiSpeaking
                    ? 'Teacher Speaking (Mic Muted)'
                    : isManuallyMuted
                      ? 'Muted'
                      : 'Listening...'
                  : 'Connecting...'}
              </p>
              {isConnected && (
                <span
                  className={`ml-3 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold ${
                    timeRemaining <= 60
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'bg-[#16A34A]/20 text-[#16A34A]'
                  }`}
                >
                  ⏱ {formatTime(timeRemaining)}
                </span>
              )}
            </div>
          </div>

          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mb-2 sm:mb-4 shrink-0">
            <AnimatePresence>
              {isRecording && !isAiSpeaking && !isManuallyMuted && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-[#16A34A]/20"
                />
              )}
              {isAiSpeaking && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-[#16A34A]/20"
                />
              )}
            </AnimatePresence>
            <div
              className={`z-10 w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
                !isRecording
                  ? 'bg-gray-800'
                  : isAiSpeaking
                    ? 'bg-gradient-to-br from-[#16A34A] to-[#0F7B35] shadow-[#16A34A]/20'
                    : isManuallyMuted
                      ? 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-500/20'
                      : 'bg-gradient-to-br from-[#16A34A] to-[#0F7B35] shadow-[#16A34A]/20'
              }`}
            >
              {!isRecording ? (
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" />
              ) : isAiSpeaking || isManuallyMuted ? (
                <MicOff className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              ) : (
                <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              )}
            </div>
          </div>

          {transcript && (
            <div
              className="w-full max-w-2xl bg-black/40 rounded-xl p-2 sm:p-4 mb-2 sm:mb-4 border border-white/5 flex-1 min-h-0 overflow-y-auto no-scrollbar"
              ref={(el) => {
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              <p className="text-[10px] sm:text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                {transcript}
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-[10px] sm:text-xs mb-2 sm:mb-4 font-mono text-center shrink-0">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={toggleMute}
              disabled={!isRecording}
              className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all transform hover:scale-105 active:scale-95 shadow-lg w-full sm:w-auto ${
                isManuallyMuted
                  ? 'bg-gray-600 hover:bg-gray-500 text-white shadow-gray-500/20'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {isManuallyMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {isManuallyMuted ? 'Unmute' : 'Mute'}
            </button>

            <button
              onClick={handleEndCall}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-xs sm:text-sm transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20 w-full sm:w-auto"
            >
              <PhoneOff className="w-4 h-4" />
              End Coaching Session
            </button>
          </div>
        </>
      )}
    </div>
  );
}
