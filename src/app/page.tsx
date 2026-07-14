'use client';
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { PageType } from '@/lib/types';
import PortalLayout from '@/components/portal/PortalLayout';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import HomePage from '@/components/public/HomePage';
import ServicesPage from '@/components/public/ServicesPage';
import ForClientsPage from '@/components/public/ForClientsPage';
import CareersPage from '@/components/public/CareersPage';
import AboutPage from '@/components/public/AboutPage';
import ContactPage from '@/components/public/ContactPage';
import LoginPage from '@/components/public/LoginPage';
import RegisterAgentPage from '@/components/public/RegisterAgentPage';
import RegisterClientPage from '@/components/public/RegisterClientPage';
import AgentDashboard from '@/components/portal/AgentDashboard';
import AgentProfile from '@/components/portal/AgentProfile';
import AgentDocuments from '@/components/portal/AgentDocuments';
import AgentAvailability from '@/components/portal/AgentAvailability';
import ClientDashboard from '@/components/portal/ClientDashboard';
import ClientAgents from '@/components/portal/ClientAgents';
import ClientNeeds from '@/components/portal/ClientNeeds';
import ClientJobs from '@/components/portal/ClientJobs';
import AdminDashboard from '@/components/portal/AdminDashboard';
import AdminUsers from '@/components/portal/AdminUsers';
import AdminJobPosts from '@/components/portal/AdminJobPosts';
import PaymentTakerDashboard from '@/components/portal/PaymentTakerDashboard';
import PendingPaymentPage from '@/components/portal/PendingPaymentPage';
import MessagesPage from '@/components/portal/MessagesPage';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

const PORTAL_PAGES = new Set<PageType>([
  'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability',
  'client-dashboard', 'client-agents', 'client-needs', 'client-jobs',
  'admin-dashboard', 'admin-users', 'admin-job-posts',
  'payment-taker-dashboard',
  'messages',
]);

const VALID_PAGES = new Set([...PORTAL_PAGES,
  'home','services','for-clients','careers','about','contact',
  'login','register-agent','register-client','pending-payment'
]);

function PublicRouter() {
  const { currentPage } = useAppStore();
  const hideNav = currentPage === 'login' || currentPage === 'register-agent' || currentPage === 'register-client';
  return (
    <div className="min-h-screen flex flex-col">
      {!hideNav && <PublicNavbar />}
      <main className="flex-1">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'services' && <ServicesPage />}
        {currentPage === 'for-clients' && <ForClientsPage />}
        {currentPage === 'careers' && <CareersPage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
        {currentPage === 'login' && <LoginPage />}
        {currentPage === 'register-agent' && <RegisterAgentPage />}
        {currentPage === 'register-client' && <RegisterClientPage />}
      </main>
      {!hideNav && <PublicFooter />}
    </div>
  );
}

function ToastBridge() {
  const { toasts, removeToast } = useAppStore();
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    toasts.forEach((t: { id: string; variant?: string }) => {
      if (t.variant === 'success') toast.success(t.description || t.title || 'Success');
      else if (t.variant === 'destructive') toast.error(t.description || t.title || 'Error');
      else toast(t.description || t.title || 'Notification');
      setTimeout(() => removeToast(t.id), 5000);
    });
  }, [toasts, removeToast]);

  useEffect(() => {
    const currentIds = new Set(toasts.map(t => t.id));
    prevIds.current.forEach(id => { if (!currentIds.has(id)) removeToast(id); });
    prevIds.current = currentIds;
  }, [toasts, removeToast]);

  return null;
}

export default function Home() {
  const { currentPage, isAuthenticated, navigateTo } = useAppStore();
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setPortalError((e as ErrorEvent).message);
      console.error('Portal render error:', (e as ErrorEvent).message);
      return false;
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  const isPortal = PORTAL_PAGES.has(currentPage);
  const isPendingPayment = currentPage === 'pending-payment';

  let page;
  if (isPortal) {
    if (!isAuthenticated) {
      page = (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <Card className="w-full max-w-md"><CardContent className="p-8 text-center">
            <LogIn className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-slate-400 text-sm mb-6">You need to sign in to access this area.</p>
            <Button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold" onClick={() => navigateTo('login')}>Sign In</Button>
          </CardContent></Card>
        </div>
      );
    } else {
      page = (
        <>
          {portalError && (
            <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.95)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',color:'white'}}>
              <div style={{background:'#1e293b',borderRadius:'12px',padding:'24px',maxWidth:'600px',border:'1px solid #ef4444'}}>
                <h2 style={{color:'#ef4444',marginBottom:'12px'}}>Rendering Error</h2>
                <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:'13px',color:'#fca5a5',margin:0}}>{portalError}</pre>
                <button onClick={() => setPortalError(null)} style={{marginTop:'16px',padding:'8px 16px',background:'#3b82f6',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>Dismiss</button>
              </div>
            </div>
          )}
          <PortalLayout>
            {currentPage === 'agent-dashboard' && <AgentDashboard />}
            {currentPage === 'agent-profile' && <AgentProfile />}
            {currentPage === 'agent-documents' && <AgentDocuments />}
            {currentPage === 'agent-availability' && <AgentAvailability />}
            {currentPage === 'client-dashboard' && <ClientDashboard />}
            {currentPage === 'client-agents' && <ClientAgents />}
            {currentPage === 'client-needs' && <ClientNeeds />}
            {currentPage === 'client-jobs' && <ClientJobs />}
            {currentPage === 'admin-dashboard' && <AdminDashboard />}
            {currentPage === 'admin-users' && <AdminUsers />}
            {currentPage === 'admin-job-posts' && <AdminJobPosts />}
            {currentPage === 'payment-taker-dashboard' && <PaymentTakerDashboard />}
            {currentPage === 'messages' && <MessagesPage />}
          </PortalLayout>
        </>
      );
    }
  } else if (isPendingPayment) {
    page = <PendingPaymentPage />;
  } else {
    page = <PublicRouter />;
    if (!VALID_PAGES.has(currentPage)) {
      page = <PublicRouter />;
    }
  }

  return (
    <>
      <ToastBridge />
      {page}
    </>
  );
}
