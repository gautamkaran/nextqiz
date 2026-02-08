const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');
const { setupWorker } = require('@socket.io/sticky');

// Error Logging
process.on('uncaughtException', (err) => {
    fs.writeFileSync('socket-error.log', `Worker ${process.pid} Uncaught: ${err.stack}\n`, { flag: 'a' });
    console.error(`Worker ${process.pid} Uncaught:`, err);
});
process.on('unhandledRejection', (reason) => {
    fs.writeFileSync('socket-error.log', `Worker ${process.pid} Rejection: ${reason.stack || reason}\n`, { flag: 'a' });
    console.error(`Worker ${process.pid} Rejection:`, reason);
});

// Load Env
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const MONGO_URI = process.env.MONGODB_URI;

// --- Database Schemas ---
const QuizSchema = new mongoose.Schema({
    title: String,
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: Number,
        timeLimit: Number
    }]
});
const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);

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
const Game = mongoose.models.Game || mongoose.model('Game', GameSchema);

// --- Worker Setup ---
const startWorker = async () => {
    // 1. Connect DB
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`Worker ${process.pid} DB Connected`);
    } catch (err) {
        console.error(`Worker ${process.pid} DB Fail:`, err);
        process.exit(1);
    }

    // 2. Setup HTTP & Socket.IO
    const httpServer = http.createServer((req, res) => {
        res.writeHead(200);
        res.end(`NextQiz Worker ${process.pid}`);
    });

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        transports: ['websocket'], // Force WebSocket for performance
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // 3. Setup Redis Adapter (for Cluster Broadcasts)
    // We try to connect to local Redis. If fail, we log warning (clustering won't sync rooms perfectly without it)
    const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
    const REDIS_PORT = process.env.REDIS_PORT || 6379;
    const pubClient = createClient({ port: REDIS_PORT, host: REDIS_HOST, lazyConnect: true });
    const subClient = pubClient.duplicate();

    try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log(`Worker ${process.pid} Redis Adapter Connected`);
    } catch (e) {
        console.warn(`Worker ${process.pid} Redis connection failed. Clustering broadcast might fail if Redis is missing. Error: ${e.message}`);
        // Continue without Redis (will work for single worker or sticky sessions but broadcasts across workers won't work)
    }

    // 4. Setup Sticky Session
    setupWorker(io);

    // 5. Game Logic
    io.on('connection', (socket) => {
        // console.log(`Worker ${process.pid} Client connected: ${socket.id}`);

        socket.on('HOST_JOIN_GAME', async (roomPin) => {
            socket.join(roomPin);
            console.log(`Worker ${process.pid} Host joined room: ${roomPin}`);
        });

        socket.on('START_GAME', async (roomPin) => {
            try {
                const game = await Game.findOne({ pin: roomPin });
                if (!game) return;

                game.status = 'active';
                game.currentQuestionIndex = 0;
                await game.save();

                io.to(roomPin).emit('GAME_STARTED');

                const quiz = await Quiz.findById(game.quizId);
                const question_raw = quiz.questions[0];

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
                    const leaderboard = game.players
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5)
                        .map(p => ({ nickname: p.nickname, score: p.score }));

                    io.to(roomPin).emit('GAME_OVER', leaderboard);
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

            const leaderboard = game.players
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(p => ({ nickname: p.nickname, score: p.score }));

            io.to(roomPin).emit('SHOW_LEADERBOARD', leaderboard);
        });

        socket.on('PLAYER_JOIN', async ({ pin, nickname }) => {
            try {
                const game = await Game.findOne({ pin, status: 'waiting' }); // Check 'waiting' to prevent late joins if desired
                // OR allow joining mid-game but valid logic needed. User requested stability. 
                // Let's stick to waiting for now, but if late join is allowed, remove status check.
                // Assuming standard quiz flow: Join -> Start.

                if (!game) {
                    socket.emit('ERROR', { message: 'Game not found' });
                    return;
                }

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
                io.to(pin).emit('PLAYER_JOINED', { nickname, total: game.players.length });
                socket.emit('JOIN_SUCCESS', { pin, nickname });

            } catch (e) {
                console.error('JOIN ERROR:', e);
                socket.emit('ERROR', { message: 'Join failed' });
            }
        });

        socket.on('SUBMIT_ANSWER', async ({ pin, answerIndex, timeLeft }) => {
            try {
                const game = await Game.findOne({ pin });
                if (!game) return;

                const quiz = await Quiz.findById(game.quizId);
                const player = game.players.find(p => p.socketId === socket.id);
                // In cluster mode, socket.id might not match if reconnect happened? 
                // Actually, socket.id does change on reconnect. 
                // Scaling Consideration: Use a stable user ID or session if possible. 
                // But for this simple app, we rely on the socket remaining connected. 
                // If auto-reconnect happens, the socket ID changes unless using session recovery (Connection State Recovery). 
                // Implementing full recovery is complex. For now, rely on robust heartbeat.

                if (!player) return; // Should handle this case better (re-auth)

                const questionIndex = game.currentQuestionIndex;
                if (questionIndex === -1) return;

                if (player.answers.some(a => a.questionIndex === questionIndex)) return;

                const question = quiz.questions[questionIndex];
                const isCorrect = question.correctAnswer === answerIndex;

                let points = 0;
                if (isCorrect) {
                    points = 1000 + (timeLeft * 10);
                    player.score += points;
                }

                player.answers.push({
                    questionIndex,
                    answerIndex,
                    isCorrect,
                    timeTaken: question.timeLimit - timeLeft
                });

                await game.save();

                socket.emit('ANSWER_RESULT', { isCorrect, score: player.score, pointsAdded: points });

                // OPTIMIZATION: Debounce/Throttle broadcasting update count
                // Instead of emitting every single time, we can trust the client to know it answered, 
                // and maybe only emit count every 500ms if tracking live progress.
                // For now, simple emit is fine for 200 users if Redis adapter is fast.
                const answersCount = game.players.filter(p => p.answers.some(a => a.questionIndex === questionIndex)).length;
                io.to(pin).emit('UPDATE_ANSWERS_COUNT', answersCount);

            } catch (e) {
                console.error(e);
            }
        });

        socket.on('disconnect', () => {
            // Handle disconnect
        });
    });
};

startWorker();
