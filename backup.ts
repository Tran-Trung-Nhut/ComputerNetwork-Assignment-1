public downloadOperation(torrentFile: string, socket: Socket, desPeerInfo: PeerInfo) {
    // TODO: GET THE FILE INFO FROM torrentFile

    let peerHavingFiles: PeerInfo[] = []
    // TODO: Find Peers : online + have above file info 


    // Divide EQUALLY num of chunks for peers
    const fileSize = 0
    const chunkSize = 512 * 1024 // KB
    const numChunks = fileSize / chunkSize
    const realNumChunks = numChunks + fileSize % chunkSize
    const numPeers = peerHavingFiles.length
    const numParts = numChunks / numPeers

    //TODO: how to set pathFile
    for (let i = 0; i < numPeers; i++) {
        const peer = peerHavingFiles[i]
        const chunkInfo: FileChunkInfo = {
            pathFile: "",
            startChunk: i * numParts,
            endChunk: (i + 2) * numParts > realNumChunks ? realNumChunks : (i + 1) * numParts - 1,
            chunkSize: chunkSize
        }
        const msg: SendChunkInfoMessage = { message: SEND_CHUNKINFOS_MSG, chunkInfo: chunkInfo, peerInfo: desPeerInfo }

        const buffer = Buffer.from(JSON.stringify(msg))
        socket.connect(peer.port, peer.IP, () => {
            const socket = this.getConnection(peer)
            socket.write(buffer, (error) => {
                if (error) {
                    console.error('Error sending message:', error);
                } else {
                    console.log(`Send chunks info (chunk ${chunkInfo.startChunk} to chunk ${chunkInfo.endChunk}) to IP(${peer.IP}) - port (${peer.port})`);
                    socket.end();
                }
            });
        })
    }
}

    private getConnection(peerInfo: PeerInfo) {
    for (const id in this.onlinePeers) {
        let peer = this.onlinePeers[id]
        if (peer.IP === peerInfo.IP) {
            if (peer.connection == null) {
                return new Socket()
            }
            return peer.connection
        }
    }
    peerInfo.connection = new Socket()
    this.onlinePeers[peerInfo.IP] = peerInfo
    return peerInfo.connection
}