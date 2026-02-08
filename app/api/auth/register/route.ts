
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import { User } from '@/models/Schema'; // Assuming you put models in models/Schema.ts
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

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Username already taken' },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            password: hashedPassword,
            role: 'admin', // Defaulting to admin for now as requested for "Teacher" setup
        });

        // Auto login after register
        await loginUser({
            id: newUser._id,
            username: newUser.username,
            role: newUser.role
        });

        return NextResponse.json({
            success: true,
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (error: any) {
        console.error('Registration Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
