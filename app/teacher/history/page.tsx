
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generatePDFReport } from '@/components/reports/PDFGenerator';
import { Download, Calendar, Users, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GameHistory {
    id: string;
    pin: string;
    date: string;
    quizTitle: string;
    playersCount: number;
    quizQuestions: any[];
    players: any[];
}

export default function HistoryPage() {
    const [games, setGames] = useState<GameHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/games/history')
            .then(res => res.json())
            .then(data => {
                if (data.history) {
                    setGames(data.history);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleDownload = (game: GameHistory) => {
        generatePDFReport(game);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-white">
                <Loader2 className="animate-spin h-8 w-8 text-[var(--color-brand)]" />
                <span className="ml-2">Loading history...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Game History</h1>
                        <p className="text-muted-foreground">View past games and download reports</p>
                    </div>
                    <Button variant="secondary" onClick={() => router.push('/teacher/dashboard')}>
                        Back to Dashboard
                    </Button>
                </div>

                {games.length === 0 ? (
                    <Card className="bg-card/50 border-white/10 text-center py-12">
                        <CardContent>
                            <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                            <h2 className="text-xl font-bold text-white">No Games Yet</h2>
                            <p className="text-muted-foreground mt-2">Complete a game to see it here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {games.map((game) => (
                            <Card key={game.id} className="bg-card border-white/10 hover:border-[var(--color-brand)] transition-colors">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-start">
                                        <span className="text-xl truncate" title={game.quizTitle}>{game.quizTitle}</span>
                                        <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">PIN: {game.pin}</span>
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        {new Date(game.date).toLocaleDateString()} at {new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-sm text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} />
                                            {game.playersCount} Players
                                        </div>
                                    </div>
                                    <Button className="w-full" onClick={() => handleDownload(game)}>
                                        <Download size={16} className="mr-2" /> Download Report
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
