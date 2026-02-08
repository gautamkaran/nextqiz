
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Quiz } from '@/models/Schema';
import { getSession } from '@/lib/auth';
import { QuizSchema } from '@/lib/validators';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Correct type for Next.js 15+ or 13+ app dir
) {
    // Await params if necessary or access them directly depending on Next.js version.
    // In recent Next.js versions params is a Promise.
    const { id } = await context.params;

    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const quiz = await Quiz.findOne({ _id: id, createdBy: session.id });

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        return NextResponse.json({ quiz });
    } catch (error) {
        console.error('Quiz Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

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

        const updatedQuiz = await Quiz.findOneAndUpdate(
            { _id: id, createdBy: session.id },
            { title, description, questions },
            { new: true }
        );

        if (!updatedQuiz) {
            return NextResponse.json({ error: 'Quiz not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, quiz: updatedQuiz });
    } catch (error: any) {
        console.error('Quiz Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const deletedQuiz = await Quiz.findOneAndDelete({ _id: id, createdBy: session.id });

        if (!deletedQuiz) {
            return NextResponse.json({ error: 'Quiz not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Quiz Delete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
