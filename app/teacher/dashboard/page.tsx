
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Play, MoreVertical, Edit, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Dashboard() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await fetch('/api/quizzes');
            const data = await res.json();
            if (data.quizzes) {
                setQuizzes(data.quizzes);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const deleteQuiz = async (id: string) => {
        if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/quizzes/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setQuizzes(quizzes.filter(q => q._id !== id));
            } else {
                alert('Failed to delete quiz');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting quiz');
        } finally {
            setDeletingId(null);
        }
    };

    const startGame = async (quizId: string) => {
        // Logic to start game will go here (POST to /api/games/create)
        // For now we just console log
        console.log('Starting game for:', quizId);
        try {
            const res = await fetch('/api/games/create', { // We need to build this route next!
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId })
            });
            const data = await res.json();
            if (data.gameId) {
                router.push(`/teacher/game/${data.gameId}`); // Redirect to lobby
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage your quizzes and track performance.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/teacher/history">
                        <Button variant="outline">
                            <History className="mr-2 h-4 w-4" /> History
                        </Button>
                    </Link>
                    <Link href="/teacher/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create New Quiz
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards Placeholder */}
                <Card className="bg-gradient-to-br from-card to-card/50 border-none ring-1 ring-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{quizzes.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-card to-card/50 border-none ring-1 ring-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">0</div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">Your Quizzes</h2>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 rounded-lg bg-card/50 animate-pulse"></div>
                    ))}
                </div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-20 bg-card/30 rounded-lg border border-dashed border-muted">
                    <p className="text-muted-foreground mb-4">You haven't created any quizzes yet.</p>
                    <Link href="/teacher/create">
                        <Button variant="outline">Create your first quiz</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <Card key={quiz._id} className="group hover:ring-1 hover:ring-[var(--color-brand)] transition-all">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                                    <div className="relative group/menu" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === quiz._id ? null : quiz._id);
                                            }}
                                        >
                                            <MoreVertical size={16} />
                                        </Button>

                                        {openMenuId === quiz._id && (
                                            <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteQuiz(quiz._id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                                                    disabled={deletingId === quiz._id}
                                                >
                                                    <Trash2 size={14} />
                                                    {deletingId === quiz._id ? 'Deleting...' : 'Delete Quiz'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                    {quiz.description || "No description provided."}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-xs text-muted-foreground gap-2 mb-4">
                                    <span className="bg-white/5 px-2 py-1 rounded">{quiz.questions.length} Questions</span>
                                    <span className="bg-white/5 px-2 py-1 rounded">Last updated: {new Date(quiz.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1" onClick={() => startGame(quiz._id)}>
                                        <Play className="mr-2 h-4 w-4" /> Start
                                    </Button>
                                    <Link href={`/teacher/quiz/${quiz._id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit size={16} />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
