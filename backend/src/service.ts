const fs = require('fs')
export async function getFilePieces(
    filePath: string,
    pieceLength: number,
    pieceIndices: number[]
): Promise<Buffer[]> {
    const file = fs.openSync(filePath, 'r'); // Open the file for reading
    const chunks: Buffer[] = [];

    try {
        for (const index of pieceIndices) {
            // Calculate start and end byte positions for each piece
            const start = index;
            const buffer = Buffer.alloc(pieceLength); // Allocate a buffer for the piece

            // Read the piece into the buffer
            const bytesRead = fs.readSync(file, buffer, 0, pieceLength, start);

            // Push only the bytes read (trim buffer if it's the last piece and not full)
            chunks.push(buffer.slice(0, bytesRead));
        }
    } finally {
        fs.closeSync(file); // Close the file after reading
    }

    return chunks;
}