import dotenv from 'dotenv'
import { createServer, Server } from 'net';
import { Socket } from 'net';
import { networkInterfaces } from 'os'
import { infoHashMapPeersJSONPath, PeerInfo, portSendFile, REQUEST_ALL_PEERINFOS, SEND_ALL_PEERINFOS_MSG, SEND_DOWNLOAD_SIGNAL_MSG, SEND_PEERINFOS_MSG, SEND_PIECEINFOS_MSG, server, trackerPort } from './model';
import { Connection } from './model';
import logger from '../log/winston';
import { readFileSync } from 'fs';
import { checkEqual2Peers, updateInfoHashFile } from './service';
import { ifError } from 'assert';

dotenv.config()

class Tracker {
    private netServer: Server
    private onlinePeers: { [peerIP: string]: boolean } = {}
    private infoHashList: { [infoHash: string]: PeerInfo[] }
    private allPeerInfos: { info: PeerInfo, online: boolean }[] = []


    constructor(port: number) {

        this.infoHashList = JSON.parse(readFileSync(infoHashMapPeersJSONPath, 'utf8'));
        this.allPeerInfos = this.getAllPeerInfos()


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

                    if (message.message === REQUEST_ALL_PEERINFOS) {
                        socket.write(JSON.stringify({
                            message: SEND_ALL_PEERINFOS_MSG,
                            infos: this.allPeerInfos
                        }))
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
        this.initializeOnlinePeers()

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
                if (!(peerInfo.IP in this.onlinePeers)) this.connectToPeer(peerInfo.IP)
            });
        });

    }

    private connectToPeer(IP: string) {
        const client = new Socket();

        // Attempt to connect to the server
        client.connect(portSendFile, IP, () => {
            logger.info(`Connected with IP-${IP}`)
            this.onlinePeers[IP] = true;

            // You can now interact with the server here
        });

        client.on('error', (err) => {
            logger.error(`Peer IP-${IP} offline. Retrying...`);
            this.onlinePeers[IP] = false;
            client.destroy(); // close the socket
            setTimeout(() => this.connectToPeer(IP), 1000); // retry after 1 second
        });

    }

    private getAllPeerInfos(): { info: PeerInfo, online: boolean }[] {
        const allPeers: PeerInfo[] = [];
        const uniquePeers: { info: PeerInfo, online: boolean }[] = [];

        // Flatten all PeerInfo arrays into a single array
        for (const peers of Object.values(this.infoHashList)) {
            allPeers.push(...peers);
        }

        // Collect unique peers
        for (const peer of allPeers) {
            if (!uniquePeers.some(uniquePeer => checkEqual2Peers(uniquePeer.info, peer))) {
                uniquePeers.push({ info: peer, online: false });
            }
        }

        return uniquePeers;
    }

}


new Tracker(Number(server.port))