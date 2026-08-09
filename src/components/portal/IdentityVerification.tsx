'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, CheckCircle2, X, ArrowRight, ArrowLeft, Camera, AlertCircle,
  RotateCcw, Upload, CreditCard, IdCard, ShieldCheck, Clock, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

type Stage = 'intro' | 'select_type' | 'capture_front' | 'capture_back' | 'capture_selfie' | 'submitting' | 'done' | 'review_status';

export default function IdentityVerification() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [stage, setStage] = useState<Stage>('intro');
  const [docType, setDocType] = useState<'id_card' | 'drivers_license'>('id_card');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('unverified');
  const [statusNotes, setStatusNotes] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ front: string | null; back: string | null; selfie: string | null }>({
    front: null, back: null, selfie: null,
  });
  const [capturing, setCapturing] = useState<'front' | 'back' | 'selfie' | null>(null);
  const [streamReady, setStreamReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── Callback ref for the video element ───────────────────────────────────
  // This is the KEY fix. When React unmounts/remounts the <video> element
  // during stage transitions (AnimatePresence), this callback fires and
  // re-attaches the camera stream immediately. Without this, the camera
  // shows "Starting camera..." forever because the stream is attached to
  // an element that no longer exists.
  const videoRefCallback = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      element.play().catch(() => {});
      setStreamReady(true);
    }
  }, []);

  // Load current verification status
  useEffect(() => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };
    fetch('/api/agents/verify-id', { headers })
      .then(r => r.json())
      .then(data => {
        if (data.status) {
          setStatus(data.status);
          setStatusNotes(data.notes || null);
          if (data.status === 'pending' || data.status === 'verified' || data.status === 'rejected') {
            setStage('review_status');
          }
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // ─── Auto-start camera when entering a capture stage ─────────────────────
  // This is the KEY fix. When capturePhoto advances to the next stage
  // (e.g. capture_front → capture_back), this useEffect fires and starts
  // the camera for the new stage. Without this, the camera was never started
  // for the 2nd and 3rd photos.
  useEffect(() => {
    if (stage === 'capture_front' || stage === 'capture_back' || stage === 'capture_selfie') {
      const which = stage === 'capture_front' ? 'front' : stage === 'capture_back' ? 'back' : 'selfie';
      // Small delay to let the video element mount after AnimatePresence transition
      const timer = setTimeout(() => { startCamera(which); }, 300);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
  };

  const startCamera = useCallback(async (which: 'front' | 'back' | 'selfie') => {
    setError(null);
    setStreamReady(false);
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      // Use rear camera for ID photos, front camera for selfie
      const facingMode = which === 'selfie' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      // Attach to the video element (it should be mounted by now)
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStreamReady(true);
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Could not access your camera. Please allow camera permissions in your browser settings, then try again.');
    }
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // If selfie (front camera), mirror the image to match what the user sees
    if (capturing === 'selfie') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      if (capturing === 'front') {
        setPhotos(p => ({ ...p, front: url }));
      } else if (capturing === 'back') {
        setPhotos(p => ({ ...p, back: url }));
      } else if (capturing === 'selfie') {
        setPhotos(p => ({ ...p, selfie: url }));
      }
      stopCamera();
      // Move to next stage — the useEffect will auto-start the camera
      if (capturing === 'front') {
        setCapturing('back');
        setStage('capture_back');
      } else if (capturing === 'back') {
        setCapturing('selfie');
        setStage('capture_selfie');
      } else if (capturing === 'selfie') {
        setCapturing(null);
        setStage('submitting');
      }
    }, 'image/jpeg', 0.85);
  };

  const startCapture = (which: 'front' | 'back' | 'selfie') => {
    setCapturing(which);
    if (which === 'front') setStage('capture_front');
    else if (which === 'back') setStage('capture_back');
    else setStage('capture_selfie');
    // The useEffect above will auto-start the camera when the stage changes
  };

  const retake = (which: 'front' | 'back' | 'selfie') => {
    setPhotos(p => ({ ...p, [which]: null }));
    startCapture(which);
  };

  const handleSubmit = async () => {
    if (!photos.front || !photos.back || !photos.selfie || !currentUser) return;
    setStage('submitting');
    setError(null);

    try {
      const fetchBlob = async (url: string, label: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new File([blob], `${label}.jpg`, { type: 'image/jpeg' });
      };

      const frontFile = await fetchBlob(photos.front, 'front');
      const backFile = await fetchBlob(photos.back, 'back');
      const selfieFile = await fetchBlob(photos.selfie, 'selfie');

      const formData = new FormData();
      formData.append('front', frontFile);
      formData.append('back', backFile);
      formData.append('selfie', selfieFile);
      formData.append('type', docType);

      const res = await fetch('/api/agents/verify-id', {
        method: 'POST',
        headers: {
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission failed');
      }

      const data = await res.json();
      addToast({ title: 'Verification Submitted!', description: data.message, variant: 'success' });
      setStatus('pending');
      setStage('done');
    } catch (err) {
      console.error('Submit failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStage('capture_selfie');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigateTo('agent-dashboard' as never)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#16A34A]" /> Identity Verification
        </h2>
        <p className="text-sm text-gray-500 mt-1">Verify your identity to apply for jobs on Gig Solutions.</p>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── REVIEW STATUS ─── */}
        {stage === 'review_status' && (
          <motion.div key="review_status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 text-center">
                {status === 'pending' && (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
                      <Clock className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Under Review</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                      Your ID verification has been submitted and is being reviewed by our team.
                      You will be notified within 1-2 business days.
                    </p>
                    <Button variant="outline" onClick={() => navigateTo('agent-dashboard' as never)}>Back to Dashboard</Button>
                  </>
                )}
                {status === 'verified' && (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Identity Verified ✓</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                      Your identity has been verified. You can now apply for any job on the platform.
                    </p>
                    <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-dashboard' as never)}>
                      Browse Jobs <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}
                {status === 'rejected' && (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Not Approved</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                      Your ID verification was not approved. Please review the notes below and resubmit.
                    </p>
                    {statusNotes && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                        <p className="text-xs text-red-700">{statusNotes}</p>
                      </div>
                    )}
                    <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => { setStatus('unverified'); setStage('intro'); setPhotos({ front: null, back: null, selfie: null }); }}>
                      Resubmit Verification
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── INTRO ─── */}
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10">
                    <ShieldCheck className="h-8 w-8 text-[#16A34A]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Verify Your Identity</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    To ensure a safe platform for everyone, all agents must verify their identity
                    before their applications are processed. This takes about 3 minutes.
                  </p>
                </div>

                <div className="space-y-3 max-w-md mx-auto mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white text-sm font-bold">1</div>
                    <div><p className="text-sm font-medium text-gray-900">Select your document type</p><p className="text-xs text-gray-500">ID Card or Driver&apos;s License</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white text-sm font-bold">2</div>
                    <div><p className="text-sm font-medium text-gray-900">Photo of the front of your ID</p><p className="text-xs text-gray-500">Use your camera to take a clear photo</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white text-sm font-bold">3</div>
                    <div><p className="text-sm font-medium text-gray-900">Photo of the back of your ID</p><p className="text-xs text-gray-500">Flip the card over and take a photo</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white text-sm font-bold">4</div>
                    <div><p className="text-sm font-medium text-gray-900">Selfie holding your ID</p><p className="text-xs text-gray-500">A photo of you holding your ID card next to your face</p></div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 max-w-md mx-auto">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Tips for a clear photo:</strong> Good lighting, no glare, all text visible, and fill the frame with the ID card.</span>
                  </p>
                </div>

                <div className="text-center">
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={() => setStage('select_type')}>
                    Start Verification <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── SELECT DOCUMENT TYPE ─── */}
        {stage === 'select_type' && (
          <motion.div key="select_type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Select Your Document Type</h3>
                <p className="text-sm text-gray-600 text-center mb-6">Choose which document you&apos;ll use to verify your identity.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                  <button onClick={() => setDocType('id_card')} className={`p-6 rounded-xl border-2 transition-all ${docType === 'id_card' ? 'border-[#16A34A] bg-[#16A34A]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <IdCard className={`h-10 w-10 mx-auto mb-3 ${docType === 'id_card' ? 'text-[#16A34A]' : 'text-gray-400'}`} />
                    <p className="text-sm font-semibold text-gray-900">ID Card</p>
                    <p className="text-xs text-gray-500 mt-1">National ID card</p>
                  </button>
                  <button onClick={() => setDocType('drivers_license')} className={`p-6 rounded-xl border-2 transition-all ${docType === 'drivers_license' ? 'border-[#16A34A] bg-[#16A34A]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <CreditCard className={`h-10 w-10 mx-auto mb-3 ${docType === 'drivers_license' ? 'text-[#16A34A]' : 'text-gray-400'}`} />
                    <p className="text-sm font-semibold text-gray-900">Driver&apos;s License</p>
                    <p className="text-xs text-gray-500 mt-1">Valid driver&apos;s license</p>
                  </button>
                </div>

                <div className="text-center">
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={() => startCapture('front')}>
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── CAPTURE (front/back/selfie) ─── */}
        {(stage === 'capture_front' || stage === 'capture_back' || stage === 'capture_selfie') && (
          <motion.div key={stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 text-center">
                  <Badge variant="outline" className="text-[10px] uppercase mb-2">
                    {stage === 'capture_front' && 'Step 2 of 4'}
                    {stage === 'capture_back' && 'Step 3 of 4'}
                    {stage === 'capture_selfie' && 'Step 4 of 4'}
                  </Badge>
                  <h3 className="text-lg font-bold text-gray-900">
                    {stage === 'capture_front' && 'Photo of the Front of Your ID'}
                    {stage === 'capture_back' && 'Photo of the Back of Your ID'}
                    {stage === 'capture_selfie' && 'Selfie Holding Your ID'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {stage === 'capture_front' && 'Place your ID card on a flat surface. Make sure all text is clearly visible and there is no glare.'}
                    {stage === 'capture_back' && 'Flip your ID card over. Make sure all text is clearly visible.'}
                    {stage === 'capture_selfie' && 'Hold your ID card next to your face. Both your face and the ID should be clearly visible.'}
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                    <AlertCircle className="size-4 shrink-0" />{error}
                  </div>
                )}

                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4 max-w-2xl mx-auto">
                  <video ref={videoRefCallback} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: stage === 'capture_selfie' ? 'scaleX(-1)' : 'none' }} />
                  {!streamReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  )}
                  {streamReady && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-xs">
                      {stage === 'capture_selfie' ? 'Position your face and ID in the frame' : 'Position your ID card in the frame'}
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex items-center justify-center gap-3">
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={capturePhoto} disabled={!streamReady}>
                    <Camera className="h-4 w-4 mr-2" /> Take Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── SUBMITTING ─── */}
        {stage === 'submitting' && (
          <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Review Your Photos</h3>
                <p className="text-sm text-gray-500 text-center mb-6">Make sure all photos are clear before submitting.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                  {(['front', 'back', 'selfie'] as const).map((which) => (
                    <div key={which} className="text-center">
                      <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-2">
                        {photos[which] ? (
                          <img src={photos[which]!} alt={which} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-xs">No photo</div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 capitalize">
                        {which === 'selfie' ? 'Selfie with ID' : `${which} of ID`}
                      </p>
                      {photos[which] && (
                        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => retake(which)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Retake
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4 max-w-md mx-auto">
                    <AlertCircle className="size-4 shrink-0" />{error}
                  </div>
                )}

                <div className="text-center">
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={handleSubmit}>
                    <Upload className="h-4 w-4 mr-2" /> Submit Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── DONE ─── */}
        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#16A34A]/10">
                  <CheckCircle2 className="h-12 w-12 text-[#16A34A]" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Verification Submitted!</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                  Thank you for submitting your ID verification. Our team will review it and notify you within 1-2 business days.
                </p>
                <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 px-8" onClick={() => navigateTo('agent-dashboard' as never)}>
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
