
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { Check, X, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:3001';

export default function StudentGamePage() {
    const params = useParams();
    // Resolve params properly for Next 15+ if needed, though client component params are usually direct objects in 14.
    // However, to be safe with types:
    const pin = (params.pin as string);

    const [status, setStatus] = useState<'join' | 'lobby' | 'playing' | 'feedback' | 'finished'>('join');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [question, setQuestion] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [result, setResult] = useState<any>(null);
    const [score, setScore] = useState(0);
    const [rank, setRank] = useState(0);
    const [leaderboard, setLeaderboard] = useState<{ nickname: string, score: number }[]>([]);

    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'],
            upgrade: false,
            reconnection: true,
            timeout: 20000,
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
        });

        socketRef.current.on('ERROR', (err: any) => {
            setError(err.message);
        });

        socketRef.current.on('JOIN_SUCCESS', () => {
            setStatus('lobby');
            setError('');
        });

        socketRef.current.on('NEW_QUESTION', (q: any) => {
            setStatus('playing');
            setQuestion(q);
            setTimeLeft(q.timeLimit);
            setSelectedOption(null);
            setResult(null);
        });

        socketRef.current.on('ANSWER_RESULT', (res: any) => {
            setResult(res);
            setStatus('feedback');
            if (res.score) setScore(res.score);
        });

        socketRef.current.on('GAME_OVER', (data: any) => {
            setStatus('finished');
            if (Array.isArray(data)) setLeaderboard(data);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        if (status === 'playing' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (status === 'playing' && timeLeft === 0 && selectedOption === null) {
            // Time ran out
            setStatus('feedback'); // Or just wait for next question? Let's show "Time's Up"
        }
    }, [status, timeLeft]);

    const joinGame = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname) return;
        if (socketRef.current) {
            socketRef.current.emit('PLAYER_JOIN', { pin, nickname });
        }
    };

    const submitAnswer = (index: number) => {
        if (selectedOption !== null) return; // Already answered
        setSelectedOption(index);

        if (socketRef.current) {
            socketRef.current.emit('SUBMIT_ANSWER', {
                pin,
                answerIndex: index,
                timeLeft
            });
        }
    };

    if (status === 'join') {
        return (
            <div className="min-h-screen bg-[var(--color-brand)] flex items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-center">Enter Nickname</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={joinGame} className="space-y-4">
                            <Input
                                placeholder="Your Name"
                                value={nickname}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                                maxLength={12}
                                className="text-center text-lg"
                            />
                            {error && <p className="text-destructive text-sm text-center font-medium">{error}</p>}
                            <Button type="submit" className="w-full" size="lg">Ready to Go!</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'lobby') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-8">
                <div className="animate-bounce">
                    <span className="text-6xl">🚀</span>
                </div>
                <h1 className="text-3xl font-bold text-white">You're in!</h1>
                <p className="text-xl text-muted-foreground">See your nickname on screen?</p>
                <div className="bg-[var(--color-brand)] text-black px-6 py-2 rounded-full font-bold text-xl">
                    {nickname}
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Waiting for host to start...</p>
            </div>
        );
    }

    if (status === 'playing' && question) {
        return (
            <div className="min-h-screen bg-background flex flex-col p-4">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                        <span className="bg-white/10 px-3 py-1 rounded text-white font-mono">{question.currentQuestion}/{question.totalQuestions}</span>
                        <span className="bg-[var(--color-brand)] text-black px-3 py-1 rounded font-bold">Score: {score}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white font-bold text-xl">
                        <Clock size={20} /> {timeLeft}
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-white text-black p-6 rounded-lg text-center text-2xl font-bold mb-8 shadow-lg">
                        {question.text}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {question.options.map((opt: string, i: number) => (
                            <button
                                key={i}
                                onClick={() => submitAnswer(i)}
                                disabled={selectedOption !== null}
                                className={`
                                   p-6 rounded-lg text-xl font-medium transition-all transform active:scale-95 text-left
                                   ${selectedOption === i
                                        ? 'bg-[var(--color-brand)] text-black ring-4 ring-white'
                                        : 'bg-card border border-white/10 hover:bg-white/10 text-white'}
                               `}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'feedback') {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center ${result?.isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                {result ? (
                    <>
                        <div className="bg-white/20 p-8 rounded-full mb-8">
                            {result.isCorrect ? <Check size={64} className="text-white" /> : <X size={64} className="text-white" />}
                        </div>
                        <h1 className="text-5xl font-bold text-white mb-4">{result.isCorrect ? 'Correct!' : 'Incorrect'}</h1>
                        <p className="text-2xl text-white/90 mb-8">{result.isCorrect ? `+${result.pointsAdded} Points` : 'Keep trying!'}</p>
                        <div className="bg-black/30 px-8 py-4 rounded-lg text-white font-mono text-xl">
                            Current Score: {score}
                        </div>
                    </>
                ) : (
                    <h1 className="text-3xl font-bold text-white mb-4">Time's Up!</h1>
                )}
                <p className="text-white/70 mt-12 animate-pulse">Waiting for next question...</p>
            </div>
        );
    }

    if (status === 'finished') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                {/* Animated Background Circles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* Content */}
                <div className="relative z-10 animate-fade-in-up">
                    <Trophy size={100} className="text-yellow-300 mb-6 mx-auto drop-shadow-2xl animate-scale-in" />
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-8 drop-shadow-lg">
                        Quiz Completed! 🎉
                    </h1>

                    {/* Score Card with Glassmorphism */}
                    <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-10 rounded-3xl shadow-2xl w-full max-w-md mb-10 animate-scale-in" style={{ animationDelay: '0.2s' }}>
                        <p className="text-sm text-white/80 uppercase tracking-widest font-bold mb-3">Your Score</p>
                        <p className="text-7xl md:text-8xl font-black text-white mb-2 drop-shadow-lg">{score}</p>
                        <div className="h-1 w-24 bg-gradient-to-r from-yellow-300 to-orange-400 mx-auto rounded-full mt-4"></div>
                    </div>

                    {/* Leaderboard */}
                    {leaderboard.length > 0 && (
                        <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                            <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center gap-3">
                                <Trophy className="text-yellow-300" size={32} />
                                Leaderboard
                            </h2>
                            <div className="space-y-3">
                                {leaderboard.map((player, i) => (
                                    <div
                                        key={i}
                                        className={`flex justify-between items-center p-4 rounded-2xl transition-all duration-300 ${player.nickname === nickname
                                                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold shadow-lg scale-105'
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold shadow-md ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                                                    i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                                                        i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                                            'bg-white/20 text-white'
                                                }`}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                            </span>
                                            <span className="text-lg">{player.nickname}</span>
                                        </div>
                                        <span className="text-xl font-bold">{player.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Play Again Button */}
                    <Link href="/" className="mt-10 block">
                        <Button className="bg-white text-emerald-600 hover:bg-gray-100 font-bold text-lg px-10 py-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105">
                            Play Again
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return <div className="min-h-screen bg-background text-white p-8">Loading...</div>;
}
