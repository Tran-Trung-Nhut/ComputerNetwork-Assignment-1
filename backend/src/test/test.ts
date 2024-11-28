import { readFileSync, writeFile } from 'fs';
import { DownloadState, infoHashMapPeersJSONPath, PeerInfo } from '../model';
import { setPeerOffline } from '../service';

// Define the `PeerInfo` type
// let infoHashList: { [infoHash: string]: PeerInfo[] } = {}

// const data = readFileSync(infoHashMapPeersJSONPath, 'utf8');

// infoHashList = JSON.parse(data);
// console.log(createPieceIndexsForPeers([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33], 5))
// const obj: { [key: string]: PeerInfo } = {
//     'a': { IP: 'A', ID: 'A', port: 50 },
//     'b': { IP: 'A', ID: 'A', port: 50 },
// };

// Object.entries(obj).forEach(([key, value]) => {
//     console.log(`${key}: ${value.ID}`);
// });
const downloads: { [infohash: string]: { downloadStates: DownloadState[] } } = {
    "hash1": {
        downloadStates: [
            {
                indexes: [1, 2],
                indexMapBuffer: new Map(),
                fileName: "file1",
                maxSize: 100,
                peers: [
                    { info: { ID: "peer1", IP: "192.168.0.1", port: 60 }, numPieces: 5, numDownloaded: 3, online: true },
                    { info: { ID: "peer2", IP: "192.168.0.2", port: 60 }, numPieces: 2, numDownloaded: 2, online: true }
                ]
            }
        ]
    }
};

const peerToSetOffline: PeerInfo = { ID: "peer1", IP: "192.168.0.1", port: 60 };

setPeerOffline(downloads, peerToSetOffline);

console.log(downloads['hash1'].downloadStates[0].peers);
// The peer with id "peer1" will have its "online" status set to false
