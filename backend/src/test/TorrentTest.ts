import createTorrent from 'create-torrent';
import * as fs from 'fs';
import * as path from 'path';
import ParseTorrent from 'parse-torrent';

// Custom File class

// Define an array of file paths
const filePaths = [
    'D:/ComputerNetwork-Assignment-1/backend/resources/video/dog.mp4',
    'D:/ComputerNetwork-Assignment-1/backend/resources/video/kitten.mp4',
];

// Create an array of File objects

// Convert File objects to the required format

createTorrent(
    filePaths,
    (err, torrentBuffer) => {
        if (err) {
            console.error('Error creating torrent:', err);
            return;
        }

        fs.writeFileSync('multi_files.torrent', torrentBuffer);
        console.log('Torrent file created successfully: multi_files.torrent');
    }
);

let torrent = fs.readFileSync('multi_files.torrent') as any
torrent = ParseTorrent(torrent)
console.log(torrent)


