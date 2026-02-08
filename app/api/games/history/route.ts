
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Game, Quiz } from '@/models/Schema';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch games hosted by this user
        // Populate quiz details to get the title
        const games = await Game.find({ hostId: session.id, status: 'finished' })
            .sort({ createdAt: -1 })
            .populate('quizId', 'title questions');

        // Transform data for frontend
        const history = games.map(game => {
            const quiz = game.quizId as any;
            return {
                id: game._id,
                pin: game.pin,
                date: game.createdAt || (game._id as any).getTimestamp(), // Fallback if createdAt missing
                quizTitle: quiz?.title || 'Unknown Quiz',
                playersCount: game.players.length,
                quizQuestions: quiz?.questions || [],
                players: game.players
            };
        });

        return NextResponse.json({ history });
    } catch (error) {
        console.error('History Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
