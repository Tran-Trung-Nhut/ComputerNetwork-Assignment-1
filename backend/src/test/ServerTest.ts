import { createServer, Server, Socket } from 'net'
import { WebSocket, WebSocketServer } from 'ws'


interface custom_object {
    name: string,
    int: Number,
}
const fs = require('fs')
// Specify the IP and port for the server
const serverIP = '192.168.92.196';  // Replace with your desired IP
const serverPort = 3000;

const server = new WebSocket.Server({ host: serverIP, port: serverPort });
const writeStream = fs.createWriteStream('recieved_torrent_file.torrent'); // example with MP4
const chunks: Buffer[] = []
server.on('connection', (ws) => {
    console.log('New client connected');

    // Receive messages from the client
    ws.on('message', (chunk: Buffer) => {
        // chunks.push(chunk)
        // if (chunks.length == 7) {
        //     for (let index = 0; index < 7; index++) {
        //         console.log(index)
        //         writeStream.write(chunks[index])
        //     }
        //     server.close()
        // }
        console.log(chunk.toString)
        writeStream.write(chunk)
    });


    // Send a message to the client

});


console.log(`WebSocket server is running on ws://${serverIP}:${serverPort}`);
server.on('close', () => {
    console.log('Received Files');
});
