import logger from "../log/winston";

const fs = require('fs')
export function getFilePieces(
    filePath: string,
    pieceLength: number,
    pieceIndices: number[]
): Buffer[] {
    const file = fs.openSync(filePath, 'r'); // Open the file for reading
    const chunks: Buffer[] = [];
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
                logger.error('Error reading file:', error);
            } finally {
                fs.closeSync(fileDescriptor);
            }

        }
    } finally {
        fs.closeSync(file); // Close the file after reading
    }

    return chunks;
}