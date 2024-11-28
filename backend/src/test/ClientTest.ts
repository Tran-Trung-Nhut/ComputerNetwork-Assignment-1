// import { WebSocket, WebSocketServer } from 'ws'

// const fs = require('fs');

// const serverIP = '192.168.92.196';  // Replace with the server's IP
// const serverPort = 3000;

// const ws = new WebSocket(`ws://${serverIP}:${serverPort}`);
// const filePath = 'resources/video/dog.mp4';
// const chunkSize = 512 * 1024; // 16 KB in bytes

// const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });

// interface custom_object {
//     name: string,
//     int: Number,
// }

// const data: custom_object = { name: "phuoc", int: 16 }
// const message = "HELLO, IT IS USER 1"
// let buffer = Buffer.from(JSON.stringify(message))
// ws.on('open', () => {
//     fileStream.on('data', (chunk: Buffer) => {
//         console.log(chunk)
//         ws.send(chunk);
//         console.log(`Sent chunk of size: ${chunk.length} bytes`);
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

import { Socket } from 'net';

const serverAddress = '192.168.102.110'; // Replace with Program A's server IP
const serverPort = 6005; // Replace with the port Program A is listening on

// Create a new client socket
const client = new Socket();

// Connect to the server
client.connect(serverPort, serverAddress, () => {
    console.log(`Connected to server at ${serverAddress}:${serverPort}`);

    // Send data to the server
    client.write('Hello from Program B!');
});

// Handle data received from the server
client.on('data', (data: Buffer) => {
    console.log(`Received from server: ${data.toString()}`);
});

// Handle connection errors
client.on('error', (err: Error) => {
    console.error(`Error: ${err.message}`);
});

// Handle connection close
client.on('close', () => {
    console.log('Connection closed');
});

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage example
async function runTask() {
    console.log('Task started...');
    await wait(1000); // Wait for 1 second
    console.log('Task executed after 1 second.');
    client.write('Hello from Program B2!');
}
runTask()