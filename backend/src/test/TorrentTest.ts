import createTorrent from 'create-torrent';
import * as fs from 'fs';
import * as path from 'path';
import ParseTorrent from 'parse-torrent';

// Custom File class

// Define an array of file paths
const filePath = [
    'D:/ComputerNetwork-Assignment-1/backend/repository/dog.mp4',
];

// Create an array of File objects

// Convert File objects to the required format

// createTorrent(
//     filePath,
//     (err, torrentBuffer) => {
//         if (err) {
//             console.error('Error creating torrent:', err);
//             return;
//         }

//         fs.writeFileSync(`repository/${path.basename(filePath[0])}.torrent`, torrentBuffer);
//         console.log('Torrent file created successfully: multi_files.torrent');
//     }
// );

let torrent = fs.readFileSync('repository/dog.mp4.torrent') as any
torrent = ParseTorrent(torrent)
const tracker = torrent.announce[0]
const [ip, port] = tracker.split(':')
console.log(torrent.infoHash)


