import createTorrent from 'create-torrent';
import * as fs from 'fs';
import * as path from 'path';
import ParseTorrent from 'parse-torrent';

// Custom File class

// Define an array of file paths
const filePath = [
    'D:/ComputerNetwork-Assignment-1/backend/repository/sample.txt',
];

// Create an array of File objects

// Convert File objects to the required format

// createTorrent(
//     filePath,
//     { pieceLength: 2 * 1024 * 1024 },
//     (err, torrentBuffer) => {
//         if (err) {
//             console.error('Error creating torrent:', err);
//             return;
//         }

//         fs.writeFileSync(`repository/${path.basename(filePath[0])}.torrent`, torrentBuffer);
//         console.log('Torrent file created successfully: multi_files.torrent');
//     }
// );

let torrent = fs.readFileSync('repository/sample.txt.torrent') as any
torrent = ParseTorrent(torrent)
console.log(torrent.infoHash)
console.log(torrent.pieceLength)
// torrent.files.forEach((File: any, index: any) => {
//     console.log(File)
// });



