import { useState } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { DmProvider } from '@/hooks/use-dm';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Ticker from '@/components/Ticker';
import Rooms from '@/components/Rooms';
import ChatWindow from '@/components/ChatWindow';
import Stats from '@/components/Stats';
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

  const pickRoom = (id: string) => {
    setActiveRoom(id);
    document.querySelector('#chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onProfile={() => setProfileOpen(true)} />
      <main>
        <Hero />
        <Ticker />
        <Rooms activeRoom={activeRoom} onPick={pickRoom} />
        <ChatWindow activeRoom={activeRoom} onPick={setActiveRoom} />
        <Stats />
        <Rules />
      </main>
      <Footer />
      <AuthDialog />
      <WelcomeDialog />
      <DialogsList />
      <DirectMessages />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
};

const Index = () => (
  <AuthProvider>
    <DmProvider>
      <PageBody />
    </DmProvider>
  </AuthProvider>
);

export default Index;