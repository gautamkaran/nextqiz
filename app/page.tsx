
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export default function LandingPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 6) {
      router.push(`/game/${pin}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="/nextQiz.svg"
              alt="NextQiz Logo"
              width={32}
              height={32}
              priority
            />
            <span className="text-xl font-bold text-white tracking-tight">NextQiz</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Teacher Login</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white">
            Gamified Learning <br />
            <span className="text-[var(--color-brand)]">Reimagined.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The modern way to engage students with real-time quizzes. Fast, fun, and free.
          </p>

          <Card className="max-w-md mx-auto bg-card/50 border-white/10 p-2">
            <CardContent className="p-4">
              <form onSubmit={handleJoin} className="flex gap-2">
                <Input
                  placeholder="Enter Game PIN"
                  className="h-12 text-lg font-mono text-center tracking-widest uppercase"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
                <Button type="submit" size="lg" className="h-12 px-8" disabled={pin.length !== 6}>
                  Join
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border p-8 text-center text-muted-foreground text-sm">
        &copy; 2026 NextQiz. Built with Next.js 14 & Socket.IO.
      </footer>
    </div>
  );
}
