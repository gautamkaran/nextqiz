
import mongoose, { Schema, Document, Model } from 'mongoose';

// --- Interfaces ---

export interface IUser extends Document {
    username: string;
    password?: string;
    role: 'admin' | 'student';
    createdAt: Date;
}

export interface IQuestion {
    questionText: string;
    options: string[];
    correctAnswer: number; // Index of correct option
    timeLimit?: number; // Seconds
}

export interface IQuiz extends Document {
    title: string;
    description?: string;
    questions: IQuestion[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPlayer {
    socketId: string;
    nickname: string;
    score: number;
    answers: {
        questionIndex: number;
        answerIndex: number;
        isCorrect: boolean;
        timeTaken: number;
    }[];
}

export interface IGame extends Document {
    pin: string;
    quizId: mongoose.Types.ObjectId;
    hostId: mongoose.Types.ObjectId;
    status: 'waiting' | 'active' | 'finished';
    players: IPlayer[];
    currentQuestionIndex: number;
    createdAt: Date;
}

// --- Schemas ---

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: false }, // Optional for students if we ever want persistent students
    role: { type: String, enum: ['admin', 'student'], default: 'student' },
    createdAt: { type: Date, default: Date.now },
});

const QuestionSchema = new Schema<IQuestion>({
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true },
    timeLimit: { type: Number, default: 20 },
});

const QuizSchema = new Schema<IQuiz>({
    title: { type: String, required: true },
    description: { type: String },
    questions: [QuestionSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const PlayerSchema = new Schema<IPlayer>({
    socketId: { type: String },
    nickname: { type: String, required: true },
    score: { type: Number, default: 0 },
    answers: [{
        questionIndex: Number,
        answerIndex: Number,
        isCorrect: Boolean,
        timeTaken: Number,
    }],
});

const GameSchema = new Schema<IGame>({
    pin: { type: String, required: true, unique: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
    players: [PlayerSchema],
    currentQuestionIndex: { type: Number, default: -1 }, // -1 means lobby
    createdAt: { type: Date, default: Date.now },
});

// --- Models ---
// Prevent overwriting models during hot reload

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Quiz: Model<IQuiz> = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
export const Game: Model<IGame> = mongoose.models.Game || mongoose.model<IGame>('Game', GameSchema);
