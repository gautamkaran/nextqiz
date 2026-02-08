
const http = require('http');
const fs = require('fs');

process.on('uncaughtException', (err) => {
    fs.writeFileSync('socket-error.log', `Uncaught Exception: ${err.stack}\n`, { flag: 'a' });
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    fs.writeFileSync('socket-error.log', `Unhandled Rejection: ${reason.stack || reason}\n`, { flag: 'a' });
    console.error('Unhandled Rejection:', reason);
});
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars - Try multiple paths to be safe
const path = require('path');
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const PORT = 3001; // Socket server port
const MONGO_URI = process.env.MONGODB_URI;

console.log('Attempting to connect to MongoDB...');
if (!MONGO_URI) {
    console.error('FATAL: MONGODB_URI is undefined. Check your .env.local file path.');
}


// --- Database Schemas (Simplified for Server Use) ---
// We need to fetch Quiz data directly in the socket server for efficiency
const QuizSchema = new mongoose.Schema({
    title: String,
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: Number,
        timeLimit: Number
    }]
});
const Quiz = mongoose.model('Quiz', QuizSchema);

const GameSchema = new mongoose.Schema({
    pin: String,
    quizId: mongoose.Schema.Types.ObjectId,
    hostId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'waiting' },
    players: [{
        socketId: String,
        nickname: String,
        score: { type: Number, default: 0 },
        answers: [{
            questionIndex: Number,
            answerIndex: Number,
            isCorrect: Boolean,
            timeTaken: Number
        }]
    }],
    currentQuestionIndex: { type: Number, default: -1 }
});
const Game = mongoose.model('Game', GameSchema);

// --- Server Setup ---
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('NextQiz Socket Server');
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // Wait 60s before assuming drop (good for mobile)
    pingInterval: 25000 // Check every 25s
});

mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB connected for Socket Server');
}).catch(err => console.error(err));

// --- Game Logic Handling ---

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // --- HOST EVENTS ---

    socket.on('HOST_JOIN_GAME', async (roomPin) => {
        socket.join(roomPin);
        console.log(`Host joined room: ${roomPin}`);
    });

    socket.on('START_GAME', async (roomPin) => {
        console.log(`Received START_GAME for room: ${roomPin}`);
        try {
            const game = await Game.findOne({ pin: roomPin });
            if (!game) {
                console.error(`Game not found for pin: ${roomPin}`);
                return;
            }

            game.status = 'active';
            game.currentQuestionIndex = 0;
            await game.save();

            io.to(roomPin).emit('GAME_STARTED');

            // Fetch quiz to send first question
            const quiz = await Quiz.findById(game.quizId);
            const question_raw = quiz.questions[0];

            // Mask correct answer for public broadcast
            const questionData = {
                text: question_raw.questionText,
                options: question_raw.options,
                timeLimit: question_raw.timeLimit,
                currentQuestion: 1,
                totalQuestions: quiz.questions.length
            };

            io.to(roomPin).emit('NEW_QUESTION', questionData);

        } catch (e) {
            console.error(e);
        }
    });

    socket.on('NEXT_QUESTION', async (roomPin) => {
        try {
            const game = await Game.findOne({ pin: roomPin });
            if (!game) return;

            game.currentQuestionIndex += 1;
            const quiz = await Quiz.findById(game.quizId);

            if (game.currentQuestionIndex >= quiz.questions.length) {
                game.status = 'finished';
                await game.save();
                io.to(roomPin).emit('GAME_OVER');
                return;
            }

            await game.save();

            const question_raw = quiz.questions[game.currentQuestionIndex];
            const questionData = {
                text: question_raw.questionText,
                options: question_raw.options,
                timeLimit: question_raw.timeLimit,
                currentQuestion: game.currentQuestionIndex + 1,
                totalQuestions: quiz.questions.length
            };

            io.to(roomPin).emit('NEW_QUESTION', questionData);
        } catch (e) { }
    });

    socket.on('SHOW_LEADERBOARD', async (roomPin) => {
        const game = await Game.findOne({ pin: roomPin });
        if (!game) return;

        // Sort players by score desc
        const leaderboard = game.players
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Top 5
            .map(p => ({ nickname: p.nickname, score: p.score }));

        io.to(roomPin).emit('SHOW_LEADERBOARD', leaderboard);
    });

    // --- PLAYER EVENTS ---


    socket.on('PLAYER_JOIN', async ({ pin, nickname }) => {
        try {
            const game = await Game.findOne({ pin, status: 'waiting' });
            if (!game) {
                socket.emit('ERROR', { message: 'Game not found or already started' });
                return;
            }

            // Check for duplicate nickname in same game
            if (game.players.find(p => p.nickname === nickname)) {
                socket.emit('ERROR', { message: 'Nickname taken' });
                return;
            }

            game.players.push({
                socketId: socket.id,
                nickname,
                score: 0,
                answers: []
            });
            await game.save();

            socket.join(pin);

            // Notify host
            io.to(pin).emit('PLAYER_JOINED', { nickname, total: game.players.length });
            socket.emit('JOIN_SUCCESS', { pin, nickname });

        } catch (e) {
            console.error('JOIN ERROR FULL:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
            socket.emit('ERROR', { message: 'Join failed' });
        }
    });

    socket.on('SUBMIT_ANSWER', async ({ pin, answerIndex, timeLeft }) => {
        try {
            const game = await Game.findOne({ pin });
            if (!game) return;

            const quiz = await Quiz.findById(game.quizId);
            const player = game.players.find(p => p.socketId === socket.id);
            const questionIndex = game.currentQuestionIndex;

            if (!player || questionIndex === -1) return;

            // Check if already answered
            if (player.answers.some(a => a.questionIndex === questionIndex)) return;

            const question = quiz.questions[questionIndex];
            const isCorrect = question.correctAnswer === answerIndex;

            // Calculate Score (Simple logic: Correct = 1000 + TimeBonus)
            let points = 0;
            if (isCorrect) {
                points = 1000 + (timeLeft * 10); // Simple bonus
                player.score += points;
            }

            player.answers.push({
                questionIndex,
                answerIndex,
                isCorrect,
                timeTaken: question.timeLimit - timeLeft
            });

            await game.save();

            // Send feedback to player ONLY
            socket.emit('ANSWER_RESULT', { isCorrect, score: player.score, pointsAdded: points });

            // Notify Host (optional, to show "Answers: 5/10")
            const answersCount = game.players.filter(p => p.answers.some(a => a.questionIndex === questionIndex)).length;
            io.to(pin).emit('UPDATE_ANSWERS_COUNT', answersCount);

        } catch (e) {
            console.error(e);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Handle player leaving (optional: remove from DB or just mark inactive)
    });
});

server.listen(PORT, () => {
    console.log(`Socket Server running on port ${PORT}`);
});
