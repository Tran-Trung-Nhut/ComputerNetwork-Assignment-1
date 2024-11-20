// import { integer } from 'drizzle-orm/pg-core';
// import { WebSocket, WebSocketServer } from 'ws'

// const fs = require('fs');

// const serverIP = '192.168.1.77';  // Replace with the server's IP
// const serverPort = 3000;

// const ws = new WebSocket(`ws://${serverIP}:${serverPort}`);
// const filePath = 'resources/video/dog.mp4';
// const chunkSize = 512 * 1024; // 16 KB in bytes

// const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize, start: 2 * chunkSize, end: 4 * chunkSize - 1 });

// interface custom_object {
//     name: string,
//     int: Number,
// }

// const data: custom_object = { name: "phuoc", int: 16 }
// const message = "HELLO, IT IS USER 2"
// let buffer = Buffer.from(JSON.stringify(message))
// ws.on('open', () => {
//     fileStream.on('data', (chunk: Buffer) => {
//         console.log(chunk)
//         ws.send(chunk);
//         console.log(`Sent chunk of size: ${chunk.length} bytes - USER 1`);
//     });

//     // // Close connection when done
//     fileStream.on('end', () => {
//         ws.close();
//         console.log('File transfer complete');
//     });
// });

// ws.on('close', () => {
//     console.log('Disconnected from server');
// });


import { createServer, Socket } from 'net';

// Create a TCP server
const port = 6005; // Replace with your desired port
const server = createServer((socket: Socket) => {
    console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);

    // Listen for data from the client
    socket.on('data', (data: Buffer) => {
        console.log(`Received from client: ${data.toString()}`);

        // Optionally send a response back to the client
        socket.write(`Echo: ${data}`);
    });

    // Handle client disconnection
    socket.on('close', () => {
        console.log('Client disconnected');
    });

    // Handle errors
    socket.on('error', (err: Error) => {
        console.error(`Socket error: ${err.message}`);
    });
});
// Start the server
server.listen(6005)