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
import ClientProfile from '@/components/portal/ClientProfile';
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
import { ShieldAlert, LogIn } from 'lucide-react';

const PORTAL_PAGES = new Set<PageType>([
  'agent-dashboard','agent-profile','agent-documents','agent-availability',
  'client-dashboard','client-agents','client-needs','client-jobs','client-profile',
  'admin-dashboard','admin-users','admin-job-posts',
  'payment-taker-dashboard','messages',
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

// BUG FIX: ToastBridge now uses a ref to track fired IDs, preventing duplicate toasts
function ToastBridge() {
  const { toasts, removeToast } = useAppStore();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    toasts.forEach((t) => {
      if (firedRef.current.has(t.id)) return;
      firedRef.current.add(t.id);
      if (t.variant === 'success') toast.success(t.description || t.title || 'Success');
      else if (t.variant === 'destructive') toast.error(t.description || t.title || 'Error');
      else toast(t.description || t.title || 'Notification');
    });
  }, [toasts]);

  useEffect(() => {
    const currentIds = new Set(toasts.map(t => t.id));
    firedRef.current.forEach(id => { if (!currentIds.has(id)) firedRef.current.delete(id); });
  }, [toasts]);

  return null;
}

// FEATURE: Unauthorized access page for role-based access control
function UnauthorizedPage() {
  const { navigateTo } = useAppStore();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1A2E] to-[#0B1A2E]/80 p-4">
      <Card className="w-full max-w-md border-red-200"><CardContent className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm mb-6">You don't have permission to view this page.</p>
        <Button className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 font-semibold" onClick={() => navigateTo('home')}>Back to Home</Button>
      </CardContent></Card>
    </div>
  );
}

export default function Home() {
  const { currentPage, isAuthenticated, navigateTo, isRoleAllowed, syncFromHash } = useAppStore();
  const [portalError, setPortalError] = useState<string | null>(null);

  // FEATURE: Sync from URL hash on first load (so shared URLs work)
  useEffect(() => { syncFromHash(); }, []);

  // FEATURE: Listen for back/forward browser navigation
  useEffect(() => {
    const handler = () => { syncFromHash(); };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1A2E] to-[#0B1A2E]/80 p-4">
          <Card className="w-full max-w-md"><CardContent className="p-8 text-center">
            <LogIn className="h-12 w-12 text-[#16A34A] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-500 text-sm mb-6">You need to sign in to access this area.</p>
            <Button className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 font-semibold mb-3" onClick={() => navigateTo('login')}>Sign In</Button>
            <button onClick={() => navigateTo('home')} className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Home</button>
          </CardContent></Card>
        </div>
      );
    // FEATURE: Role-based access control - blocks agents from seeing admin pages
    } else if (!isRoleAllowed(currentPage)) {
      page = <UnauthorizedPage />;
    } else {
      page = (
        <>
          {portalError && (
            <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.95)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',color:'white'}}>
              <div style={{background:'#1e293b',borderRadius:'12px',padding:'24px',maxWidth:'600px',border:'1px solid #ef4444'}}>
                <h2 style={{color:'#ef4444',marginBottom:'12px'}}>Rendering Error</h2>
                {/* SECURITY FIX: Sanitize error message to prevent XSS */}
                <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:'13px',color:'#fca5a5',margin:0}}>{portalError.replace(/</g, '&lt;')}</pre>
                <button onClick={() => setPortalError(null)} style={{marginTop:'16px',padding:'8px 16px',background:'#16A34A',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>Dismiss</button>
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
            {currentPage === 'client-profile' && <ClientProfile />}
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
  }

  return (<><ToastBridge />{page}</>);
}