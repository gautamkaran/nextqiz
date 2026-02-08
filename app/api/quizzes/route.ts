
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Quiz } from '@/models/Schema';
import { getSession } from '@/lib/auth';
import { QuizSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch quizzes created by this user
        const quizzes = await Quiz.find({ createdBy: session.id }).sort({ createdAt: -1 });

        return NextResponse.json({ quizzes });
    } catch (error) {
        console.error('Quiz Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Zod Validation
        const validation = QuizSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation Error',
                details: validation.error.format()
            }, { status: 400 });
        }

        const { title, description, questions } = validation.data;

        const newQuiz = await Quiz.create({
            title,
            description,
            questions,
            createdBy: session.id,
        });

        return NextResponse.json({ success: true, quiz: newQuiz });
    } catch (error: any) {
        console.error('Quiz Creation Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
