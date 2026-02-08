
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { QuizSchema } from '@/lib/validators';

interface Question {
    questionText: string;
    options: string[];
    correctAnswer: number;
    timeLimit: number;
}

export default function CreateQuiz() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([
        { questionText: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 20 }
    ]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { questionText: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 20 }
        ]);
    };

    const removeQuestion = (index: number) => {
        if (questions.length === 1) return;
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        const question = { ...newQuestions[index], [field]: value };
        newQuestions[index] = question; // Create new ref
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = value;
        newQuestions[qIndex].options = newOptions; // Create new ref
        setQuestions(newQuestions);
    };

    const handleSubmit = async () => {
        // Zod Validation
        const validation = QuizSchema.safeParse({
            title,
            description,
            questions
        });

        if (!validation.success) {
            const errorMessages = validation.error.issues.map(issue => issue.message).join('\n');
            alert(errorMessages);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/quizzes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    questions
                })
            });

            if (res.ok) {
                router.push('/teacher/dashboard');
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create quiz');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-3xl font-bold text-white">Create New Quiz</h1>
            </div>

            <div className="space-y-4 bg-card/50 p-6 rounded-lg border border-border">
                <Input
                    placeholder="Quiz Title (e.g., Solar System Trivia)"
                    className="text-lg font-bold"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div className="space-y-6">
                {questions.map((q, qIndex) => (
                    <Card key={qIndex} className="relative group">
                        <div className="absolute top-4 left-4 bg-muted text-muted-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">
                            {qIndex + 1}
                        </div>
                        <CardHeader className="pl-16 pr-16">
                            <Input
                                placeholder="Question text..."
                                value={q.questionText}
                                onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                                className="font-medium"
                            />
                            <Button
                                variant="danger"
                                size="sm"
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeQuestion(qIndex)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </CardHeader>
                        <CardContent className="pl-16">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex gap-2 items-center">
                                        <div
                                            className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center transition-colors ${q.correctAnswer === oIndex ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-black' : 'border-muted-foreground hover:border-white'}`}
                                            onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                        >
                                            {q.correctAnswer === oIndex && <CheckCircle size={14} />}
                                        </div>
                                        <Input
                                            placeholder={`Option ${oIndex + 1}`}
                                            value={opt}
                                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                            className={q.correctAnswer === oIndex ? 'border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]' : ''}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex items-center gap-4">
                                <label className="text-sm text-muted-foreground">Time Limit (seconds):</label>
                                <select
                                    className="bg-background border border-input rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={q.timeLimit}
                                    onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                                >
                                    <option value={10}>10s</option>
                                    <option value={20}>20s</option>
                                    <option value={30}>30s</option>
                                    <option value={60}>60s</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 fixed bottom-0 left-0 right-0 border-t border-border z-10 md:pl-72">
                <Button variant="outline" onClick={addQuestion} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
                <Button onClick={handleSubmit} isLoading={loading} className="w-full md:w-auto text-lg px-8">
                    <Save className="mr-2 h-4 w-4" /> Save Quiz
                </Button>
            </div>
        </div>
    );
}
