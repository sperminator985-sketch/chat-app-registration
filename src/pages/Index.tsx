import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { DmProvider } from '@/hooks/use-dm';
import { CallProvider } from '@/hooks/use-call';
import CallWindow from '@/components/CallWindow';
import Header from '@/components/Header';
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
  const { user, openAuth } = useAuth();

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
      <Header onProfile={() => setProfileOpen(true)} />
      <main>
        {user ? (
          <ChatWindow activeRoom={activeRoom} onPick={setActiveRoom} />
        ) : (
          <>
            <div className="flex min-h-[calc(100vh-4.5rem)] flex-col">
              <div className="flex flex-1 items-center">
                <Hero />
              </div>
              <Ticker />
            </div>
            <Rooms activeRoom={activeRoom} onPick={pickRoom} />
            <Rules />
          </>
        )}
      </main>
      {!user && <Footer />}
      <AuthDialog />
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