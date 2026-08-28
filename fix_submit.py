#!/usr/bin/env python3
"""Fix: 1) Submit button — add 'uploading' stage for loading state, 2) fix error fallback."""

filepath = '/root/gig-src/src/components/portal/IdentityVerification.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: Change handleSubmit to use 'uploading' stage instead of 'submitting' ─
old_submit_start = """  const handleSubmit = async () => {
    if (!photos.front || !photos.back || !photos.selfie || !currentUser) return;
    setStage('submitting');
    setError(null);"""
new_submit_start = """  const handleSubmit = async () => {
    if (!photos.front || !photos.back || !photos.selfie || !currentUser) return;
    setStage('uploading');
    setError(null);"""
if old_submit_start in c:
    c = c.replace(old_submit_start, new_submit_start)
    print("FIX 1: handleSubmit now uses 'uploading' stage")
else:
    print("FIX 1: pattern not found")

# ─── FIX 2: Fix error fallback — go back to 'submitting' (review), not 'capture_selfie' ─
old_error = """    } catch (err) {
      console.error('Submit failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStage('capture_selfie');
    }"""
new_error = """    } catch (err) {
      console.error('Submit failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStage('submitting');
    }"""
if old_error in c:
    c = c.replace(old_error, new_error)
    print("FIX 2: error fallback now goes to 'submitting' (review page)")
else:
    print("FIX 2: pattern not found")

# ─── FIX 3: Add the 'uploading' stage render (loading spinner) ─────────────
# Insert it before the DONE stage
old_done = """        {/* ─── DONE ─── */}
        {stage === 'done' && ("""
new_done = """        {/* ─── UPLOADING ─── */}
        {stage === 'uploading' && (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#16A34A] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Uploading...</h3>
                <p className="text-sm text-gray-500">Submitting your verification photos. Please don&apos;t close this page.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── DONE ─── */}
        {stage === 'done' && ("""

if old_done in c:
    c = c.replace(old_done, new_done)
    print("FIX 3: Added 'uploading' stage with loading spinner")
else:
    print("FIX 3: pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
