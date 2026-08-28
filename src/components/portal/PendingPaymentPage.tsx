'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

/**
 * PendingPaymentPage — historically this was the payment chat page where agents
 * paid 1,000 HTG to unlock job applications. Under the new philosophy,
 * registration is FREE and there is no payment gate to apply for jobs.
 *
 * We keep the route for backwards compatibility (old shared URLs), but it just
 * tells the user that no payment is required and redirects them to the
 * dashboard.
 */
export default function PendingPaymentPage() {
  const { currentUser, navigateTo } = useAppStore();

  useEffect(() => {
    // Auto-redirect after 4 seconds
    const t = setTimeout(() => {
      navigateTo(currentUser ? (currentUser.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard') : 'home');
    }, 4000);
    return () => clearTimeout(t);
  }, [currentUser, navigateTo]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B1A2E] px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10">
          <CheckCircle2 className="h-8 w-8 text-[#16A34A]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">No Payment Required</h1>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">
          Creating an account on Gig Solutions is completely free. You can browse jobs and apply
          without any payment — just pass the per-job assessment.
        </p>
        <div className="rounded-xl border border-white/10 bg-white p-6 text-left">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Need help?</p>
              <p className="text-xs text-gray-500 mt-1">
                If you have questions, reach out to our support team from your dashboard.
              </p>
            </div>
          </div>
        </div>
        <Button
          className="mt-6 w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
          onClick={() => navigateTo(currentUser ? (currentUser.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard') : 'home')}
        >
          Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </main>
  );
}
