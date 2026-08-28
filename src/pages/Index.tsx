import { useLayoutEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { DmProvider } from '@/hooks/use-dm';
import { CallProvider } from '@/hooks/use-call';
import CallWindow from '@/components/CallWindow';
import Header from '@/components/Header';
import ServerDownBanner from '@/components/ServerDownBanner';
import BannedDialog from '@/components/BannedDialog';
import Hero from '@/components/Hero';
import Ticker from '@/components/Ticker';
import Rooms from '@/components/Rooms';
import ChatWindow from '@/components/ChatWindow';
import Rules from '@/components/Rules';
import Footer from '@/components/Footer';
import AuthDialog from '@/components/AuthDialog';
import WelcomeDialog from '@/components/WelcomeDialog';
import DialogsList from '@/components/DialogsList';
import DirectMessages from '@/components/DirectMessages';
import ProfileDialog from '@/components/ProfileDialog';
import { rooms } from '@/data/chat';

const PageBody = () => {
  const [activeRoom, setActiveRoom] = useState(rooms[1].id);
  const [profileOpen, setProfileOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const { user, openAuth } = useAuth();

  useLayoutEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        '--top-offset',
        `${el.getBoundingClientRect().height}px`,
      );
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  const pickRoom = (id: string) => {
    setActiveRoom(id);
    if (!user) {
      openAuth('register');
      return;
    }
    setTimeout(
      () => document.querySelector('#chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div ref={topRef} className="sticky top-0 z-50">
        <ServerDownBanner />
        <Header onProfile={() => setProfileOpen(true)} />
      </div>
      <main>
        {user ? (
          <ChatWindow activeRoom={activeRoom} onPick={setActiveRoom} />
        ) : (
          <>
            <div className="flex min-h-[calc(100svh-var(--top-offset,4.5rem))] flex-col md:min-h-[calc(100vh-var(--top-offset,4.5rem))]">
              <div className="flex flex-1 items-start md:items-center">
                <Hero />
              </div>
              <Ticker />
            </div>
            <Rooms activeRoom={activeRoom} onPick={pickRoom} />
            <div className="flex min-h-svh flex-col">
              <Rules />
              <Footer />
            </div>
          </>
        )}
      </main>
      <AuthDialog />
      <BannedDialog />
      <WelcomeDialog />
      <DialogsList />
      <DirectMessages />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <CallWindow />
    </div>
  );
};

const Index = () => (
  <AuthProvider>
    <DmProvider>
      <CallProvider>
        <PageBody />
      </CallProvider>
    </DmProvider>
  </AuthProvider>
);

export default Index;