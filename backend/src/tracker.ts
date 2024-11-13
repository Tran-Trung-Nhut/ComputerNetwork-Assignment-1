import dotenv from 'dotenv'
import { createServer, Server } from 'net';
import { Socket } from 'net';
import { networkInterfaces } from 'os'
import { getConnections, PeerInfo, SEND_DOWNLOAD_SIGNAL_MSG, SEND_PIECEINFOS_MSG } from './model';
import { forEachChild, getConfigFileParsingDiagnostics } from 'typescript';
import { Connection } from './model';

dotenv.config()

class Tracker {
    private netServer: Server
    private onlinePeers: PeerInfo[] = []
    private infoHashList: { [infoHash: string]: PeerInfo[] } = {} //Lưu trên DB ?
    private peerConnections: Connection[] = []

    constructor(port: number) {
        this.netServer = createServer((socket) => {
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);

            socket.on('data', (data) => {

                let message: any
                try {
                    message = JSON.parse(data.toString())


                    if (message.message === 'infohash of peer') {
                        this.addPeerTo(message.infoHashOfPeer, message.IP, Number(message.port), message.ID)
                    }

                    if (message.message === 'infoHash') {
                        this.getPeerWithInfoHash(socket, message.infoHash)
                    }

                    if (message.message === 'Update infoHash') {
                        this.AddInfoHashToPeer(message.infoHash, message.ID, message.IP, Number(message.port))
                    }

                    if (message.message === 'upload') {
                        this.addPeerTo(message.infoHash, message.IP, Number(message.port), message.ID)
                    }
                    if (message.message === SEND_DOWNLOAD_SIGNAL_MSG) {
                        console.log(`Peer IP:${socket.remoteAddress}-Port:${socket.remotePort} connect for downloading`)
                    }

                    if (message.message === 'infoHash') {
                        this.getPeerWithInfoHash(socket, message.infoHash)
                    }
                } catch (e) {
                    socket.write(JSON.stringify({
                        message: 'error',
                        failure: 'Something went wrong, please do it again'
                    }))
                }


            })

            socket.on('close', () => {
            });
        })

        const localIp = this.getLocalIp()
        if (localIp) {
            this.netServer.listen(port, localIp, () => {
                console.log(`Tracker: ${localIp}:${port}`)
            })
        } else {
            console.log('cannot open port!')
        }
    }

    private AddInfoHashToPeer = async (
        infoHash: string,
        ID: string,
        IP: string,
        port: number
    ) => {
        if (!this.infoHashList[infoHash]) {
            this.infoHashList[infoHash] = []
        }

        const peer: PeerInfo = {
            IP: IP,
            port: port,
            ID: ID
        }
        await this.infoHashList[infoHash].push({
            IP: IP,
            port: port,
            ID: ID
        })
    }

    private addPeerTo = async (
        infoHashOfPeer: [string],
        IP: string,
        port: number,
        ID: string) => {

        if (!infoHashOfPeer) return

        infoHashOfPeer.forEach(async (infoHash: string) => {

            if (!this.infoHashList[infoHash]) {
                this.infoHashList[infoHash] = [];
            }

            await this.infoHashList[infoHash].push({
                IP: IP,
                port: port,
                ID: ID
            })

        });
    }

    private getPeerWithInfoHash = (socket: Socket, infoHash: string) => {

        const peersWithInfoHash = this.infoHashList[infoHash]
        if (!peersWithInfoHash) {
            socket.write(JSON.stringify({
                message: 'error',
                failure: 'No peer has this file'
            }))

            return
        }
        const onlinePeersWithInfoHash: PeerInfo[] = []
        peersWithInfoHash.forEach((peer: PeerInfo, index: number) => {
            this.onlinePeers.forEach((onlinePeer: PeerInfo, index: number) => {
                if (onlinePeer.ID === peer.ID) {
                    onlinePeersWithInfoHash.push(peer)
                }
            })
        })

        socket.write(JSON.stringify({
            message: SEND_PIECEINFOS_MSG,
            peers: onlinePeersWithInfoHash
        }))
    }
    private responsePeerInfoForDownloading = (peerInfo: PeerInfo, infohash: string) => {
        const socket = getConnections(peerInfo, this.peerConnections)
        const peersWithInfoHash = this.infoHashList[infohash]
        if (!peersWithInfoHash) {
            socket.write(JSON.stringify({
                message: 'error',
                failure: 'No peer has this file'
            }))

            return
        }
        const onlinePeersWithInfoHash: PeerInfo[] = []
        peersWithInfoHash.forEach((peer: PeerInfo, index: number) => {
            this.onlinePeers.forEach((onlinePeer: PeerInfo, index: number) => {
                if (onlinePeer.ID === peer.ID) {
                    onlinePeersWithInfoHash.push(peer)
                }
            })
        })

        socket.write(JSON.stringify({
            message: SEND_PIECEINFOS_MSG,
            peers: onlinePeersWithInfoHash
        }))
    }

    private getLocalIp = (): string | undefined => {
        const nets = networkInterfaces();
        let localIp;

        for (const name of Object.keys(nets)) {

            if (name.includes('Wi-Fi') || name.includes('Wireless')) {
                for (const net of nets[name] || []) {
                    if (net.family === 'IPv4' && !net.internal) {
                        localIp = net.address;
                        break;
                    }
                }

                if (localIp) break;
            }
        }

        return localIp
    }
}


new Tracker(Number(process.env.TRACKER_PORT))