import { readFile, writeFile } from "fs/promises";
import logger from "../log/winston";
import { DownloadState, PeerInfo } from "./model";
import { Connection } from "./model";
import { Socket } from "net";

const fs = require('fs')
export function getFilePieces(
    filePath: string,
    pieceLength: number,
    pieceIndices: number[]
): Buffer[] {
    const file = fs.openSync(filePath, 'r'); // Open the file for reading
    const chunks: Buffer[] = [];
    console.log(pieceLength)
    console.log(pieceIndices)
    try {
        for (const index of pieceIndices) {
            // Calculate start and end byte positions for each piece
            const start = index;
            const fileDescriptor = fs.openSync(filePath, 'r'); // Open the file
            try {
                const fileStats = fs.fstatSync(fileDescriptor);
                const fileSize = fileStats.size;

                const offset = start * pieceLength;

                const remainingSize = fileSize - offset;

                if (remainingSize <= 0) {
                    console.log('No data left to read from the file.');
                }

                const bufferSize = Math.min(pieceLength, remainingSize);
                const buffer = Buffer.alloc(bufferSize);

                const bytesRead = fs.readSync(fileDescriptor, buffer, 0, bufferSize, offset);
                chunks.push(buffer);
            } catch (error) {
                logger.error(`Error when reading file at path ${filePath}`, error);
            } finally {
                fs.closeSync(fileDescriptor);
            }

        }
    } finally {
        fs.closeSync(file); // Close the file after reading
    }

    return chunks;
}

export async function updateInfoHashFile(infoHash: string, newPeer: PeerInfo, jsonpath: string) {
    try {
        // Read the existing JSON file
        const data = await readFile(jsonpath, 'utf-8');
        const infoHashList: { [infoHash: string]: PeerInfo[] } = JSON.parse(data);

        // Add the new element
        if (!infoHashList[infoHash]) {
            infoHashList[infoHash] = []; // Initialize if it doesn't exist
        }
        infoHashList[infoHash].push(newPeer);

        // Write the updated object back to the file
        const updatedJson = JSON.stringify(infoHashList, null, 2);
        await writeFile('infoHashList.json', updatedJson);

        console.log('Element added successfully!');
    } catch (err) {
        console.error('Error updating JSON file:', err);
    }
}

// Example usage
export function deletePeerOutofOnlineList(onlineList: PeerInfo[]) {

}



export async function getConnections(peer: PeerInfo, connections: Connection[]): Promise<Socket> {
    // Check if there's an existing connection
    for (let index = 0; index < connections.length; index++) {
        if (checkEqual2Peers(connections[index].peerInfo, peer)) {
            return connections[index].socket;
        }
    }




    // Create a new socket
    const socket = new Socket();




    try {
        // Push the connection early to track it
        connections.push({ peerInfo: peer, socket });




        // Await the connection using a Promise wrapper
        await new Promise<void>((resolve, reject) => {
            socket.connect(peer.port, peer.IP, () => {
                logger.info(`Connected successfully to IP:${peer.IP} - Port:${peer.port}`);
                resolve();
            });




            // Handle connection errors
            socket.on('error', (err) => {
                logger.error(`Connection error with IP:${peer.IP} - Port:${peer.port}: ${err.message}`);
                reject(err);
            });
        });
    } catch (error) {
        // Remove the failed connection from the list
        connections.pop();
    }




    return socket;
}



export function removeConnections(peer: PeerInfo, connections: Connection[]) {
    console.log(connections)
    for (let index = 0; index < connections.length; index++) {
        if (checkEqual2Peers(connections[index].peerInfo, peer)) {
            logger.info(`Remove connection with ${peer.IP}`)
            connections.splice(index, 1)
            return
        }
    }
}

export function checkEqual2Peers(peer1: PeerInfo, peer2: PeerInfo) {
    return peer1.IP === peer2.IP && peer1.port === peer2.port
}

export function createPieceIndexsForPeers(undownloadedIndices: number[], numofPeers: number): number[][] {
    const result: number[][] = []

    const numPieces = undownloadedIndices.length
    const numParts = Math.floor(numPieces / numofPeers)

    for (let i = 0; i < numofPeers; i++) {
        const start = i * numParts
        const end = (i + 2) * numParts > numPieces ? numPieces - 1 : ((i + 1) * numParts - 1)

        const tmp: number[] = []
        Array.from({ length: end - start + 1 }, (_, i) => start + i).forEach((val) => {
            tmp.push(undownloadedIndices[val])
        })
        result.push(tmp)
    }
    return result
}

export function getAllPiecesFromOnlinedPieces(downloadState: DownloadState): Boolean {
    let flag = true
    downloadState.peers.forEach((ele) => {
        if (ele.online && ele.numDownloaded != ele.numPieces) {
            flag = false
        }
    });
    return flag
}

export function setPeerOffline(downloads: { [infohash: string]: { downloadStates: DownloadState[] } }, peerInfoToSetOffline: PeerInfo): void {
    for (const infohash in downloads) {
        const downloadStates = downloads[infohash].downloadStates;

        downloadStates.forEach((state) => {
            const peer = state.peers.find(p => p.info.IP === peerInfoToSetOffline.IP);
            if (peer) {
                logger.info(`Set peer ${peer.info.IP} offline`)
                peer.online = false;
            }
        });
    }
}

export const extractIPv4 = (remoteAddress: string | undefined): string => {
    if (remoteAddress != undefined) {
        if (remoteAddress.startsWith("::ffff:")) {
            return remoteAddress.slice(7);
        }
    }
    return '';
};