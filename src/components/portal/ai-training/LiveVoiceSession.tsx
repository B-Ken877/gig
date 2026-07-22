'use client';
// Live Voice Session — real-time voice practice with an AI customer.
// Uses Gemini Live API (requires NEXT_PUBLIC_GEMINI_API_KEY + microphone access).
// Ported from interboost-agent-training, restyled with gig-solutions palette.

import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  Volume2,
  CheckCircle2,
  Phone,
  PhoneIncoming,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Scenario } from '@/lib/ai-training-types';
import {
  GoogleGenAI,
  Modality,
  Type,
  ConfigurationError,
} from '@/lib/gemini-service';
import type { LiveServerMessage } from '@google/genai';

interface Props {
  scenario: Scenario;
  voiceName: string;
  onEnd: (transcript: string) => void;
}

export default function LiveVoiceSession({
  scenario,
  voiceName,
  onEnd,
}: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isManuallyMuted, setIsManuallyMuted] = useState(false);
  const [callState, setCallState] = useState<'incoming' | 'active'>('incoming');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const lastSpeakerRef = useRef<'Customer' | 'Agent' | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isAiSpeakingRef = useRef(false);
  const isManuallyMutedRef = useRef(false);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const ringtoneCtxRef = useRef<AudioContext | null>(null);

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
    if (callState === 'incoming') {
      try {
        const ctx = new AudioContext();
        ringtoneCtxRef.current = ctx;
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.08;
        masterGain.connect(ctx.destination);

        const playRing = () => {
          if (ctx.state === 'closed') return;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(1, ctx.currentTime + 1.95);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);

          osc1.start(ctx.currentTime);
          osc2.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 2);
          osc2.stop(ctx.currentTime + 2);
        };

        playRing();
        ringtoneIntervalRef.current = setInterval(playRing, 4000);
      } catch (e) {
        console.error('Failed to play ringtone', e);
      }
    }

    return () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
      }
      if (ringtoneCtxRef.current && ringtoneCtxRef.current.state !== 'closed') {
        ringtoneCtxRef.current.close().catch(() => {});
      }
      stopSession();
    };
  }, [callState]);

  const handleAccept = () => {
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    if (ringtoneCtxRef.current && ringtoneCtxRef.current.state !== 'closed') {
      ringtoneCtxRef.current.close().catch(() => {});
    }
    setCallState('active');
    setError(null);
    startSession();
  };

  const handleDecline = () => {
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    if (ringtoneCtxRef.current && ringtoneCtxRef.current.state !== 'closed') {
      ringtoneCtxRef.current.close().catch(() => {});
    }
    onEnd('');
  };

  const startSession = async () => {
    try {
      await startAudioCapture();

      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      });

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-preview-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'markCaseResolved',
                  description:
                    'Call this function ONLY when the agent has fully and successfully resolved your issue and you are satisfied.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      reason: {
                        type: Type.STRING,
                        description:
                          'Brief reason why the case is considered resolved',
                      },
                    },
                    required: ['reason'],
                  },
                },
              ],
            },
          ],
          systemInstruction: `You are a real person named ${scenario.customerName}.
          You are calling customer support because: ${scenario.issue}.
          Your current mood is ${scenario.mood}.

          CRITICAL: Speak at a natural, conversational human pace. Do NOT talk slowly.
          Do NOT sound like a robot, a recording, or an AI assistant.
          Be a real, spontaneous human caller.
          Respond directly and naturally to the agent.

          CRITICAL: When the agent has successfully resolved your issue and you have no more questions, you MUST call the 'markCaseResolved' function before saying goodbye.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
                if (part.functionCall) {
                  if (part.functionCall.name === 'markCaseResolved') {
                    setIsResolved(true);
                    sessionRef.current?.sendToolResponse({
                      functionResponses: [
                        {
                          id: part.functionCall.id,
                          name: part.functionCall.name,
                          response: { result: 'success' },
                        },
                      ],
                    });
                  }
                }
              }
            }

            if (message.serverContent?.outputTranscription?.text) {
              const text = message.serverContent.outputTranscription.text;
              const prefix =
                lastSpeakerRef.current === 'Customer' ? '' : '\nCustomer: ';
              transcriptRef.current += `${prefix}${text}`;
              setTranscript((prev) => prev + `${prefix}${text}`);
              lastSpeakerRef.current = 'Customer';
            } else if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                  const prefix =
                    lastSpeakerRef.current === 'Customer' ? '' : '\nCustomer: ';
                  transcriptRef.current += `${prefix}${part.text}`;
                  setTranscript((prev) => prev + `${prefix}${part.text}`);
                  lastSpeakerRef.current = 'Customer';
                }
              }
            }

            if (message.serverContent?.inputTranscription?.text) {
              const text = message.serverContent.inputTranscription.text;
              const prefix =
                lastSpeakerRef.current === 'Agent' ? '' : '\nAgent: ';
              transcriptRef.current += `${prefix}${text}`;
              setTranscript((prev) => prev + `${prefix}${text}`);
              lastSpeakerRef.current = 'Agent';
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

      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to connect:', err);
      if (err instanceof ConfigurationError) {
        setError(
          'Gemini API key not configured. Set NEXT_PUBLIC_GEMINI_API_KEY to use voice practice.',
        );
      } else {
        setError('Failed to start session.');
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
    onEnd(transcriptRef.current);
  };

  // ─── 5-minute session timer ──────────────────────────────────────────
  // Auto-ends the call after 5 minutes (SESSION_DURATION_MS) to enforce
  // the daily-limit policy. The timer starts when the user accepts the call.
  const [timeRemaining, setTimeRemaining] = useState(300); // seconds
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callState !== 'active') return;
    setTimeRemaining(300);
    sessionTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up — auto-end the call
          if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
          stopSession();
          onEnd(transcriptRef.current + '\n[Session ended: 5-minute limit reached]');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [callState]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full p-2 sm:p-4 bg-[#0B1A2E] rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10">
      {callState === 'incoming' ? (
        <div className="text-center flex flex-col items-center">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-[#16A34A]/20 rounded-full flex items-center justify-center mb-4"
          >
            <PhoneIncoming className="w-8 h-8 sm:w-10 sm:h-10 text-[#16A34A]" />
          </motion.div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {scenario.customerName}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8">
            Incoming Call...
          </p>

          <div className="flex items-center gap-6 sm:gap-8">
            <button
              onClick={handleDecline}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-red-500/20"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <button
              onClick={handleAccept}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-[#16A34A] hover:bg-[#0F7B35] rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-[#16A34A]/20"
            >
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>
          {error && (
            <p className="text-red-400 mt-4 text-xs max-w-xs mx-auto">{error}</p>
          )}
        </div>
      ) : (
        <>
          <div className="text-center mb-2 sm:mb-4">
            <h2 className="text-base sm:text-xl font-bold text-white mb-1">
              Live Session: {scenario.customerName}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? isAiSpeaking
                      ? 'bg-purple-500 animate-pulse'
                      : isManuallyMuted
                        ? 'bg-gray-500'
                        : 'bg-[#16A34A] animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-mono">
                {isConnected
                  ? isAiSpeaking
                    ? 'Customer Speaking (Mic Muted)'
                    : isManuallyMuted
                      ? 'Muted'
                      : 'Listening...'
                  : 'Connecting...'}
              </p>
              {/* 5-minute countdown timer */}
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

          <AnimatePresence>
            {isResolved && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl p-2 sm:p-3 mb-2 sm:mb-4 flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                <div>
                  <h3 className="text-[#16A34A] font-bold text-xs sm:text-sm">
                    Case Resolved!
                  </h3>
                  <p className="text-[#16A34A]/80 text-[10px] sm:text-xs">
                    The customer is satisfied. You can end the session.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mb-4 sm:mb-6">
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
                  className="absolute inset-0 rounded-full bg-purple-500/20"
                />
              )}
            </AnimatePresence>
            <div
              className={`z-10 w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
                !isRecording
                  ? 'bg-gray-800'
                  : isAiSpeaking
                    ? 'bg-gradient-to-br from-purple-600 to-pink-700 shadow-purple-500/20'
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

          <div className="w-full max-w-md bg-white/5 rounded-xl p-2 sm:p-3 mb-4 sm:mb-6 border border-white/5">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Volume2 className="w-3 h-3 text-[#16A34A]" />
              <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 uppercase">
                Customer Status
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-300 italic line-clamp-2 sm:line-clamp-3">
              &ldquo;{scenario.issue}&rdquo;
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-[10px] sm:text-xs mb-2 sm:mb-4 font-mono text-center">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
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
              Hang Up
            </button>
          </div>
        </>
      )}
    </div>
  );
}
