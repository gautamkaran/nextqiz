
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Users, Play, ArrowRight, BarChart, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:3001';

export default function TeacherGamePage() {
    const params = useParams();
    const router = useRouter();
    // Handle params.id potentially being an array (though usually string in this case)
    const gameId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [status, setStatus] = useState<'loading' | 'waiting' | 'active' | 'finished'>('loading');
    const [pin, setPin] = useState('');
    const [players, setPlayers] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [answersCount, setAnswersCount] = useState(0);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Fetch game details first to get PIN
        fetch(`/api/games/${gameId}`)
            .then(res => res.json())
            .then(data => {
                if (data.game) {
                    setPin(data.game.pin);
                    setStatus(data.game.status);
                    setPlayers(data.game.players || []);
                    connectSocket(data.game.pin);
                }
            })
            .catch(err => console.error(err));

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [gameId]);

    useEffect(() => {
        if (status === 'active' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status, timeLeft]);

    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

    // ... existing use effects

    const connectSocket = (gamePin: string) => {
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'], // Force WebSocket only
            upgrade: false, // Disable upgrade since we force WS
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
        });

        socketRef.current.on('connect', () => {
            console.log('Socket Connected');
            setConnectionStatus('connected');
        });

        socketRef.current.on('disconnect', () => {
            console.warn('Socket Disconnected');
            setConnectionStatus('disconnected');
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('Connection Error:', err);
            setConnectionStatus('disconnected');
        });

        // ... rest of event listeners
        socketRef.current.emit('HOST_JOIN_GAME', gamePin);

        socketRef.current.on('PLAYER_JOINED', (data: any) => {
            console.log('Player joined', data);
            setPlayers(prev => [...prev, { nickname: data.nickname }]);
        });

        socketRef.current.on('GAME_STARTED', () => {
            setStatus('active');
        });

        socketRef.current.on('NEW_QUESTION', (question: any) => {
            setCurrentQuestion(question);
            setAnswersCount(0);
            setTimeLeft(question.timeLimit || 20);
        });

        socketRef.current.on('UPDATE_ANSWERS_COUNT', (count: number) => {
            setAnswersCount(count);
        });

        socketRef.current.on('SHOW_LEADERBOARD', (data: any) => {
            setLeaderboardData(data);
            setShowLeaderboard(true);
        });

        socketRef.current.on('GAME_OVER', (data: any) => {
            if (Array.isArray(data)) setLeaderboardData(data);
            setStatus('finished');
        });
    };

    const startGame = () => {
        console.log('Start Game button clicked');
        if (socketRef.current && socketRef.current.connected) {
            console.log('Emit START_GAME with pin:', pin);
            socketRef.current.emit('START_GAME', pin);
        } else {
            console.error('Socket not connected');
            alert('Error: Socket Disconnected. Refreshing page...');
            window.location.reload();
        }
    };

    const nextQuestion = () => {
        setShowLeaderboard(false);
        if (socketRef.current) {
            socketRef.current.emit('NEXT_QUESTION', pin);
        }
    };

    const toggleLeaderboard = () => {
        if (showLeaderboard) {
            setShowLeaderboard(false);
        } else {
            if (socketRef.current) {
                socketRef.current.emit('SHOW_LEADERBOARD', pin);
            }
        }
    };

    if (status === 'loading') {
        return <div className="p-8 text-white">Loading Game...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-8 flex flex-col items-center relative">
            {/* Connection Status Indicator */}
            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </div>
            {status === 'waiting' && (
                <div className="w-full max-w-4xl space-y-8 text-center">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold text-white">Join at <span className="text-[var(--color-brand)]">nextqiz.com</span></h1>
                        <div className="inline-block bg-white text-black text-6xl font-black py-4 px-12 rounded-lg tracking-widest">
                            {pin}
                        </div>
                        <p className="text-xl text-muted-foreground">Waiting for players...</p>
                    </div>

                    <Card className="bg-card/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2">
                                <Users size={24} />
                                {players.length} Players ({(params as any).total || players.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap justify-center gap-4">
                                {players.map((p, i) => (
                                    <div key={i} className="bg-[var(--color-brand)] text-black px-4 py-2 rounded-full font-bold animate-pulse">
                                        {p.nickname}
                                    </div>
                                ))}
                                {players.length === 0 && <span className="text-muted-foreground italic">No one here yet...</span>}
                            </div>
                        </CardContent>
                    </Card>

                    <Button size="lg" className="w-full md:w-auto text-xl py-8 px-12" onClick={startGame} disabled={players.length === 0}>
                        Start Game <Play className="ml-2 h-6 w-6" />
                    </Button>
                </div>
            )}

            {status === 'active' && currentQuestion && !showLeaderboard && (
                <div className="w-full max-w-5xl space-y-8">
                    <div className="flex justify-between items-center text-white">
                        <span className="text-xl font-mono bg-white/10 px-4 py-2 rounded">Q: {currentQuestion.currentQuestion} / {currentQuestion.totalQuestions}</span>
                        <div className="flex items-center gap-4">
                            <div className="text-xl font-mono bg-white/10 text-white px-4 py-2 rounded font-bold flex items-center gap-2">
                                <Clock size={20} /> {timeLeft}s
                            </div>
                            <div className="text-xl font-mono bg-[var(--color-brand)] text-black px-4 py-2 rounded font-bold">
                                Answers: {players.length > 0 ? `${answersCount}/${players.length}` : answersCount}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white text-black p-8 rounded-lg text-center text-3xl font-bold shadow-2xl min-h-[200px] flex items-center justify-center">
                        {currentQuestion.text}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {currentQuestion.options.map((opt: string, i: number) => (
                            <div key={i} className="bg-card border border-white/10 p-6 rounded-lg text-xl font-medium hover:bg-white/5 transition-colors text-center">
                                {opt}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-8 gap-4">
                        <Button size="lg" variant="secondary" onClick={toggleLeaderboard}>
                            Show Leaderboard
                        </Button>
                        <Button size="lg" onClick={nextQuestion}>
                            Next Question <ArrowRight className="ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {showLeaderboard && (
                <div className="w-full max-w-4xl space-y-8">
                    <h1 className="text-4xl font-bold text-white text-center">Leaderboard</h1>
                    <div className="space-y-4">
                        {leaderboardData.map((p: any, i: number) => (
                            <div key={i} className="bg-card border border-white/10 p-4 rounded-lg flex justify-between items-center animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] text-black flex items-center justify-center font-bold">
                                        {i + 1}
                                    </div>
                                    <span className="text-xl font-bold text-white">{p.nickname}</span>
                                </div>
                                <span className="text-xl font-mono text-[var(--color-brand)]">{p.score}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center pt-8 gap-4">
                        <Button size="lg" onClick={toggleLeaderboard}>
                            Back to Question
                        </Button>
                        <Button size="lg" onClick={nextQuestion}>
                            Next Question <ArrowRight className="ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {status === 'finished' && (
                <div className="w-full max-w-4xl text-center space-y-8 animate-in zoom-in duration-500">
                    <h1 className="text-6xl font-black text-white mb-8">🎉 Game Over! 🎉</h1>

                    <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20">
                        <h2 className="text-3xl font-bold text-[var(--color-brand)] mb-6 flex items-center justify-center gap-3">
                            <Trophy size={32} /> Final Standings
                        </h2>
                        <div className="space-y-4 max-w-2xl mx-auto">
                            {leaderboardData.map((p: any, i: number) => (
                                <div key={i} className={`flex justify-between items-center p-4 rounded-lg transform transition-all hover:scale-105 ${i === 0 ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' :
                                    i === 1 ? 'bg-gray-300 text-black' :
                                        i === 2 ? 'bg-amber-600 text-black' :
                                            'bg-white/5 text-white'
                                    }`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black ${i < 3 ? 'bg-black/10' : 'bg-white/10'
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <span className="text-2xl font-bold">{p.nickname}</span>
                                    </div>
                                    <span className="text-2xl font-mono font-bold">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button size="lg" className="text-xl px-8 py-6" onClick={() => router.push('/teacher/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
