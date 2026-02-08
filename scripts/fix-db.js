const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
}

async function fixIndex() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const collection = mongoose.connection.collection('quizzes');

        console.log('Attempting to drop index "roomId_1"...');
        try {
            await collection.dropIndex('roomId_1');
            console.log('Successfully dropped index "roomId_1".');
        } catch (err) {
            if (err.code === 27) {
                console.log('Index "roomId_1" not found. It might have already been removed.');
            } else {
                console.error('Error dropping index:', err.message);
            }
        }

        // List remaining indexes to be sure
        const indexes = await collection.indexes();
        console.log('Remaining indexes:', indexes);

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    }
}

fixIndex();
