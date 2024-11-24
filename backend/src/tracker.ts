import dotenv from 'dotenv'
import { createServer, Server } from 'net';
import { Socket } from 'net';
import { networkInterfaces } from 'os'
import { infoHashMapPeersJSONPath, PeerInfo, portSendFile, SEND_DOWNLOAD_SIGNAL_MSG, SEND_PEERINFOS_MSG, SEND_PIECEINFOS_MSG, server, trackerPort } from './model';
import { Connection } from './model';
import logger from '../log/winston';
import { readFileSync } from 'fs';
import { updateInfoHashFile } from './service';
import { ifError } from 'assert';

dotenv.config()

class Tracker {
    private netServer: Server
    private onlinePeers: { [peerIP: string]: boolean } = {}
    private infoHashList: { [infoHash: string]: PeerInfo[] }


    constructor(port: number) {

        this.infoHashList = JSON.parse(readFileSync(infoHashMapPeersJSONPath, 'utf8'));
        this.initializeOnlinePeers()
        this.netServer = createServer((socket) => {
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);

            socket.on('data', (data) => {
                let message: any
                try {
                    message = JSON.parse(data.toString())
                    logger.info("GIVEN DATA: " + message.toString())

                    if (message.message === 'upload') {
                        this.addPeerTo(message.IP, Number(message.port), message.ID, message.infoHash)
                    }

                    if (message.message === SEND_DOWNLOAD_SIGNAL_MSG) {
                        logger.info(`Peer IP:${socket.remoteAddress}-Port:${socket.remotePort} connect for downloading - InfoHash:${message.infoHash}`)
                        const peerInfo: PeerInfo = { IP: socket.remoteAddress as string, port: message.port as number, ID: 'peer1' }
                        this.responsePeerInfoForDownloading(socket, message.infoHash)
                    }
                } catch (e) {
                    socket.write(JSON.stringify({
                        message: 'error',
                        failure: 'Something went wrong, please do it again'
                    }))
                }


            })

            socket.on('error', (err) => {
                console.log(err.name + err.message)
                if (err.message.includes('ECONNRESET')) {
                    this.onlinePeers[socket.remoteAddress as string] = false
                    logger.error(`Peer ${socket.remoteAddress} offline`)
                }
            });
        })

        const localIp = this.getLocalIp()
        if (localIp) {
            console.log(`Tracker: ${localIp}:${port}`)
            this.netServer.listen(port, localIp, () => {

            })
        } else {
            console.log('cannot open port!')
        }


    }


    private addPeerTo = async (
        IP: string,
        port: number,
        ID: string, infoHash: any) => {

        if (!this.infoHashList) return

        await updateInfoHashFile(infoHash, { IP: IP, port: port, ID: ID }, infoHashMapPeersJSONPath)
    }

    private responsePeerInfoForDownloading = (socket: Socket, infohash: string) => {
        // const socket = getConnections(peerInfo, this.peerConnections)
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
            Object.entries(this.onlinePeers).forEach(([key, value]) => {
                if (key == peer.IP && value) onlinePeersWithInfoHash.push(peer)
            })
        })
        console.log(onlinePeersWithInfoHash.length)
        socket.write(JSON.stringify({
            message: SEND_PEERINFOS_MSG,
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

    private initializeOnlinePeers() {
        Object.values(this.infoHashList).forEach(peerList => {
            peerList.forEach(peerInfo => {
                const flag = false
                if (!(peerInfo.IP in this.onlinePeers)) {
                    this.onlinePeers[peerInfo.IP] = true;
                }
            });
        });


    }





}


new Tracker(Number(server.port))