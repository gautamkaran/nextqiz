const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

console.log("Attempting to connect to http://localhost:3001...");

socket.on("connect", () => {
    console.log("SUCCESS: Connected to Socket Server! ID:", socket.id);
    process.exit(0);
});

socket.on("connect_error", (err) => {
    console.error("ERROR: Connection Failed:", err.message);
    process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.error("TIMEOUT: Could not connect in 5 seconds.");
    process.exit(1);
}, 5000);
