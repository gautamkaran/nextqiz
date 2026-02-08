const cluster = require('cluster');
const http = require('http');
const { Server } = require('socket.io');
const { setupMaster, setupWorker } = require('@socket.io/sticky');
const { createAdapter, setupPrimary } = require('@socket.io/cluster-adapter');
const os = require('os');
const express = require('express');

// Determine worker count - for exam setup, we can fix it to 2-4 or use heavy CPU count
// For a VPS, 4 workers is usually plenty unless it's a huge machine
const numCPUs = os.cpus().length;
const WORKERS = Math.min(numCPUs, 4); // Cap at 4 workers to save RAM if many cores

// If run as `node socket-server/cluster-server.js`
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    console.log(`Setting up ${WORKERS} workers...`);

    const httpServer = http.createServer();

    // Setup sticky sessions
    setupMaster(httpServer, {
        loadBalancingMethod: "least-connection",
    });

    // Setup primary for cluster adapter
    setupPrimary();

    // Fork workers
    for (let i = 0; i < WORKERS; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log(`Cluster Primary listening on port ${PORT}`);
    });

} else {
    // WORKER PROCESS
    console.log(`Worker ${process.pid} started`);

    // Import the main app logic from server.js (we need to refactor server.js first)
    // For now, let's assume we can import the initialization function
    // Or we inline the worker setup here to ensure it uses the adapter.

    // We will need to Modify server.js to export an initialization function 
    // instead of running immediately.
    require('./server-worker');
}
