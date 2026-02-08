
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Game } from '@/models/Schema';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // In Next.js 15+, params is a Promise, but in 14 it's not. 
        // Adapting to strict App Router types where params might be promised or direct.
        // However, the signature above uses Promise<{ id: string }> as per latest Next.js types.
        const { id } = await params;

        const game = await Game.findById(id).populate('players');

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        return NextResponse.json({ game });
    } catch (error) {
        console.error('Game Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
