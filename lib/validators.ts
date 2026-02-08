
import { z } from 'zod';

export const QuestionSchema = z.object({
    questionText: z.string().min(1, "Question text is required"),
    options: z.array(z.string()).min(2, "At least 2 options are required"),
    correctAnswer: z.number().min(0, "Correct answer index is required"),
    timeLimit: z.number().min(5).max(300).optional().default(20)
});

export const QuizSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().optional(),
    questions: z.array(QuestionSchema).min(1, "At least 1 question is required")
});

export type QuestionInput = z.infer<typeof QuestionSchema>;
export type QuizInput = z.infer<typeof QuizSchema>;

export const AuthSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username too long"),
    password: z.string().min(6, "Password must be at least 6 characters")
});

export type AuthInput = z.infer<typeof AuthSchema>;

export const GameCreateSchema = z.object({
    quizId: z.string().min(1, "Quiz ID is required")
});

export type GameCreateInput = z.infer<typeof GameCreateSchema>;
