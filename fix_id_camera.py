#!/usr/bin/env python3
"""Fix: camera doesn't start for back/selfie — the issue is AnimatePresence delays the video element mount, and the 200ms timeout is too short. Also need to re-attach stream when stage changes."""

filepath = '/root/gig-src/src/components/portal/IdentityVerification.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: Add a useEffect that watches stage changes and starts the camera ─
# The problem: when capturePhoto moves to the next stage (e.g. capture_front → capture_back),
# AnimatePresence unmounts the old video element and mounts a new one. But startCamera
# is only called from startCapture (which is only called from the "Continue" button or retake).
# When capturePhoto auto-advances to the next stage, startCamera is NEVER called.

# Add a useEffect that detects when the stage changes to a capture stage and
# starts the camera automatically.
old_load = """  // Load current verification status
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
  }, [currentUser]);"""

new_load = """  // Load current verification status
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
  }, [stage]);"""

if old_load in c:
    c = c.replace(old_load, new_load)
    print("FIX 1: Added useEffect to auto-start camera on stage change")
else:
    print("FIX 1: pattern not found")

# ─── FIX 2: Update startCapture to NOT call startCamera (the useEffect handles it) ─
old_start = """  const startCapture = (which: 'front' | 'back' | 'selfie') => {
    setCapturing(which);
    if (which === 'front') setStage('capture_front');
    else if (which === 'back') setStage('capture_back');
    else setStage('capture_selfie');
    // Wait for the stage to render the video element, then start the camera
    setTimeout(() => { startCamera(which); }, 200);
  };"""

new_start = """  const startCapture = (which: 'front' | 'back' | 'selfie') => {
    setCapturing(which);
    if (which === 'front') setStage('capture_front');
    else if (which === 'back') setStage('capture_back');
    else setStage('capture_selfie');
    // The useEffect above will auto-start the camera when the stage changes
  };"""

if old_start in c:
    c = c.replace(old_start, new_start)
    print("FIX 2: startCapture no longer calls startCamera (useEffect handles it)")
else:
    print("FIX 2: pattern not found")

# ─── FIX 3: capturePhoto — don't auto-advance to next stage, let the user click a button ─
# Actually, the auto-advance is fine — the useEffect will start the camera for the next stage.
# But let's make sure capturing is set correctly for the next stage.
old_capture_end = """      stopCamera();
      // Move to next stage
      if (capturing === 'front') {
        setStage('capture_back');
      } else if (capturing === 'back') {
        setStage('capture_selfie');
      } else if (capturing === 'selfie') {
        setStage('submitting');
      }
      setCapturing(null);"""

new_capture_end = """      stopCamera();
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
      }"""

if old_capture_end in c:
    c = c.replace(old_capture_end, new_capture_end)
    print("FIX 3: capturePhoto sets capturing before stage change")
else:
    print("FIX 3: pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
