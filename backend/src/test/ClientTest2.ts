import { integer } from 'drizzle-orm/pg-core';
import { WebSocket, WebSocketServer } from 'ws'

const fs = require('fs');

const serverIP = '192.168.1.77';  // Replace with the server's IP
const serverPort = 3000;

const ws = new WebSocket(`ws://${serverIP}:${serverPort}`);
const filePath = 'resources/video/dog.mp4';
const chunkSize = 512 * 1024; // 16 KB in bytes

const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize, start: 4 * chunkSize });

interface custom_object {
    name: string,
    int: Number,
}

const data: custom_object = { name: "phuoc", int: 16 }
const message = "HELLO, IT IS USER 1"
let buffer = Buffer.from(JSON.stringify(message))
ws.on('open', () => {
    fileStream.on('data', (chunk: Buffer) => {
        console.log(chunk)
        ws.send(chunk);
        console.log(`Sent chunk of size: ${chunk.length} bytes - USER 2`);
    });

    // // Close connection when done
    fileStream.on('end', () => {
        ws.close();
        console.log('File transfer complete');
    });
});

ws.on('close', () => {
    console.log('Disconnected from server');
});