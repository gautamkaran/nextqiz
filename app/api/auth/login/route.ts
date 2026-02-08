
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import { User } from '@/models/Schema';
import { loginUser } from '@/lib/auth';
import { AuthSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();

        // Zod Validation
        const validation = AuthSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation Error',
                details: validation.error.format()
            }, { status: 400 });
        }

        const { username, password } = validation.data;

        const user = await User.findOne({ username });
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const isMatch = await bcrypt.compare(password, user.password!);
        if (!isMatch) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        await loginUser({
            id: user._id,
            username: user.username,
            role: user.role
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
