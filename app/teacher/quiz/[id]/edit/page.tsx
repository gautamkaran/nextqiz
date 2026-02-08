
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Trash, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

interface Question {
    questionText: string;
    options: string[];
    correctAnswer: number;
    timeLimit: number;
}

export default function EditQuiz() {
    const router = useRouter();
    const params = useParams();
    const quizId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchQuiz();
    }, [quizId]);

    const fetchQuiz = async () => {
        try {
            const res = await fetch(`/api/quizzes/${quizId}`);
            if (!res.ok) throw new Error('Failed to fetch quiz');
            const data = await res.json();
            if (data.quiz) {
                setTitle(data.quiz.title);
                setDescription(data.quiz.description || '');
                setQuestions(data.quiz.questions);
            }
        } catch (err) {
            setError('Could not load quiz details.');
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            questionText: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            timeLimit: 20
        }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        if (!title.trim()) {
            setError('Quiz title is required');
            setSaving(false);
            return;
        }

        if (questions.length === 0) {
            setError('Add at least one question');
            setSaving(false);
            return;
        }

        // Validate all questions have text and options
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].questionText.trim()) {
                setError(`Question ${i + 1} can't be empty`);
                setSaving(false);
                return;
            }
            if (questions[i].options.some(opt => !opt.trim())) {
                setError(`All options for Question ${i + 1} must be filled`);
                setSaving(false);
                return;
            }
        }

        try {
            const res = await fetch(`/api/quizzes/${quizId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    questions
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Quiz updated successfully!');
                setTimeout(() => {
                    router.push('/teacher/dashboard');
                }, 1500);
            } else {
                setError(data.error || 'Failed to update quiz');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading Quiz...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-8 pb-32">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <h1 className="text-3xl font-bold text-white">Edit Quiz</h1>
                </div>

                {/* Main Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Details</CardTitle>
                        <CardDescription>Update the basic info for your quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <Input
                                placeholder="e.g. Science Trivia"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                            <Textarea
                                placeholder="What's this quiz about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Questions */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Questions ({questions.length})</h2>
                        <Button onClick={addQuestion} variant="outline" className="border-dashed">
                            <Plus className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </div>

                    {questions.map((q, qIndex) => (
                        <Card key={qIndex} className="relative group">
                            <CardContent className="pt-6 space-y-4">
                                <div className="absolute top-4 right-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => removeQuestion(qIndex)}
                                    >
                                        <Trash size={18} />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[1fr,200px] gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Question Text</label>
                                        <Textarea
                                            value={q.questionText}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateQuestion(qIndex, 'questionText', e.target.value)}
                                            placeholder="Type your question here..."
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Time Limit</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={q.timeLimit}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                                        >
                                            <option value={10}>10 Seconds</option>
                                            <option value={20}>20 Seconds</option>
                                            <option value={30}>30 Seconds</option>
                                            <option value={60}>60 Seconds</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Answer Options</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-2">
                                                <div
                                                    className={`
                                                        w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors
                                                        ${q.correctAnswer === oIndex
                                                            ? 'border-[var(--color-brand)] bg-[var(--color-brand)]'
                                                            : 'border-muted-foreground hover:border-white'}
                                                    `}
                                                    onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                                >
                                                    {q.correctAnswer === oIndex && <div className="w-2 h-2 bg-black rounded-full" />}
                                                </div>
                                                <Input
                                                    value={opt}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(qIndex, oIndex, e.target.value)}
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    className={q.correctAnswer === oIndex ? 'border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]' : ''}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-white/10 flex justify-end gap-4 items-center">
                    {error && <span className="text-destructive font-bold animate-pulse">{error}</span>}
                    {success && <span className="text-green-500 font-bold animate-pulse">{success}</span>}
                    <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} size="lg" className="px-8">
                        {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
