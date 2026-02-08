
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Game } from '@/models/Schema';
import { getSession } from '@/lib/auth';
import { GameCreateSchema } from '@/lib/validators';

function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
        const validation = GameCreateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation Error',
                details: validation.error.format()
            }, { status: 400 });
        }

        const { quizId } = validation.data;

        let pin = generatePin();
        // Simple check for collision (in prod, use a loop)
        let exists = await Game.findOne({ pin });
        if (exists) pin = generatePin();

        const newGame = await Game.create({
            pin,
            quizId,
            hostId: session.id,
            status: 'waiting',
            players: [],
            currentQuestionIndex: -1
        });

        return NextResponse.json({ success: true, gameId: newGame._id, pin: newGame.pin });
    } catch (error) {
        console.error('Game Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
