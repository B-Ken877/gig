'use client';
// Learn Mode Viewer — plays back an AI-generated transcript with TTS.
// Ported from interboost-agent-training, restyled with gig-solutions palette.

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Loader2, User, Headphones, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Scenario, Message } from '@/lib/ai-training-types';
import { generateTTS } from '@/lib/gemini-service';

interface Props {
  scenario: Scenario;
  messages: Message[];
  onEnd: () => void;
}

export default function LearnModeViewer({ scenario, messages, onEnd }: Props) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const audioCacheRef = useRef<{ [key: number]: string }>({});
  const preloadingRef = useRef<{ [key: number]: Promise<string> }>({});

  useEffect(() => {
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });

    if (messages.length > 0) {
      preloadAudio(0);
      if (messages.length > 1) preloadAudio(1);
    }

    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [messages]);

  const preloadAudio = async (index: number): Promise<string> => {
    if (index >= messages.length) return '';
    if (audioCacheRef.current[index]) return audioCacheRef.current[index];
    if (preloadingRef.current[index]) return preloadingRef.current[index];

    const message = messages[index];
    const voiceName = message.speaker === 'Customer' ? 'Kore' : 'Zephyr';

    const promise = generateTTS(message.text, voiceName).then((base64) => {
      audioCacheRef.current[index] = base64;
      return base64;
    });

    preloadingRef.current[index] = promise;
    return promise;
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  };

  const playNext = async (index: number) => {
    if (index >= messages.length) {
      setIsPlaying(false);
      setCurrentIndex(-1);
      return;
    }

    setCurrentIndex(index);
    preloadAudio(index + 1);
    preloadAudio(index + 2);

    let base64Audio = audioCacheRef.current[index];

    if (!base64Audio) {
      setIsLoadingAudio(true);
      try {
        base64Audio = await preloadAudio(index);
      } catch (error) {
        console.error('TTS Error:', error);
        setIsLoadingAudio(false);
        setIsPlaying(false);
        return;
      }
    }

    setIsLoadingAudio(false);

    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    const buffer = ctx.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);

    stopAudio();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    sourceNodeRef.current = source;
    source.start();

    source.onended = () => {
      if (sourceNodeRef.current === source) {
        playNext(index + 1);
      }
    };
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      setIsPlaying(true);
      playNext(currentIndex === -1 ? 0 : currentIndex);
    }
  };

  // ─── 5-minute playback timer ─────────────────────────────────────────
  // Stops playback after 5 minutes and shows the "finished" state.
  const [timeRemaining, setTimeRemaining] = useState(300);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }
    setTimeRemaining(300);
    playbackTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
          setIsPlaying(false);
          stopAudio();
          // Jump to the "finished" state by setting currentIndex past the end
          setCurrentIndex(messages.length);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, messages.length]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentMessage =
    currentIndex >= 0 && currentIndex < messages.length
      ? messages[currentIndex]
      : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#0B1A2E] rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Learn Mode</h2>
          <p className="text-[10px] sm:text-xs text-gray-400 font-mono mt-1">
            Watch AI solve: {scenario.issue}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {isPlaying && (
            <span
              className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold ${
                timeRemaining <= 60
                  ? 'bg-red-500/20 text-red-400 animate-pulse'
                  : 'bg-[#16A34A]/20 text-[#16A34A]'
              }`}
            >
              ⏱ {formatTime(timeRemaining)}
            </span>
          )}
          <button
            onClick={togglePlay}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#16A34A] hover:bg-[#0F7B35] text-white'
            }`}
          >
            {isPlaying ? (
              <Square className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
            )}
          </button>
          <button
            onClick={() => {
              stopAudio();
              onEnd();
            }}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#16A34A]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#16A34A]/5 rounded-full blur-3xl"></div>
        </div>

        <AnimatePresence mode="wait">
          {!isPlaying && currentIndex === -1 ? (
            <motion.div
              key="start-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center z-10"
            >
              <div className="w-20 h-20 mx-auto bg-[#16A34A]/10 rounded-full flex items-center justify-center mb-6">
                <Play className="w-8 h-8 text-[#16A34A] ml-1" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Ready to Learn?
              </h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                Click play to watch the AI Agent resolve this customer&apos;s
                issue step-by-step.
              </p>
            </motion.div>
          ) : currentMessage ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full max-w-2xl z-10 flex flex-col max-h-full"
            >
              <div
                className={`flex flex-col items-center text-center p-4 sm:p-8 rounded-3xl border flex-1 min-h-0 overflow-y-auto no-scrollbar ${
                  currentMessage.speaker === 'Customer'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-[#16A34A]/10 border-[#16A34A]/20'
                }`}
              >
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg ${
                    currentMessage.speaker === 'Customer'
                      ? 'bg-gradient-to-br from-gray-500 to-gray-600 shadow-gray-500/30'
                      : 'bg-gradient-to-br from-[#16A34A] to-[#0F7B35] shadow-[#16A34A]/30'
                  }`}
                >
                  {currentMessage.speaker === 'Customer' ? (
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  ) : (
                    <Headphones className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  )}
                </div>

                <h3
                  className={`text-xs sm:text-sm font-bold uppercase tracking-widest mb-2 sm:mb-4 shrink-0 ${
                    currentMessage.speaker === 'Customer'
                      ? 'text-gray-400'
                      : 'text-[#16A34A]'
                  }`}
                >
                  {currentMessage.speaker === 'Customer'
                    ? scenario.customerName
                    : 'AI Agent'}
                </h3>

                <p className="text-lg sm:text-2xl font-medium text-white leading-relaxed">
                  &ldquo;{currentMessage.text}&rdquo;
                </p>

                {isLoadingAudio && (
                  <div className="mt-4 sm:mt-8 flex items-center gap-2 text-gray-500 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] sm:text-xs font-mono uppercase">
                      Loading Audio...
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center z-10"
            >
              <div className="w-20 h-20 mx-auto bg-[#16A34A]/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Case Resolved</h3>
              <p className="text-gray-400">
                The AI Agent successfully handled the interaction.
              </p>
              <button
                onClick={() => {
                  stopAudio();
                  onEnd();
                }}
                className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors"
              >
                Return to Menu
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
