import { createServer, Server, Socket } from 'net'
import fs from 'fs'
import path, { basename, parse } from 'path'
import dotenv from 'dotenv'
import { app } from '../app';
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';
import { hostname, arch, platform } from 'os';
import crypto from 'crypto';
import { PeerInfo, PieceDownloadInfo, RETRIVE_PEERINFOS_MSG, SEND_PIECEINFOS_MSG } from '../model';
import { getFilePieces } from '../service';

const generatePeerID = (): string => {
    const deviceInfo = `${hostname()}-${arch()}-${platform()}`;
    return crypto.createHash('sha256').update(deviceInfo).digest('hex');
};

const peerID = generatePeerID();

dotenv.config()

const parseTorrent = require('parse-torrent')
const createTorrent = require('create-torrent')

let defaultPort: number = 5678

function getWifiIPAddress() {
    const networkInterface: any = networkInterfaces();
    let wifiIPAddress = null;

    for (const iface in networkInterface) {
        const addresses = networkInterface[iface];

        for (const addr of addresses) {
            // Chọn IPv4 và loại bỏ địa chỉ internal (localhost)
            if (addr.family === 'IPv4' && !addr.internal) {
                // Kiểm tra tên interface cho các hệ điều hành
                if (
                    iface.toLowerCase().includes('wlan') ||
                    iface.toLowerCase().includes('wifi') ||
                    iface.toLowerCase().includes('wi-fi') ||
                    iface.toLowerCase().includes('en')
                ) {
                    wifiIPAddress = addr.address;
                    break;
                }
            }
        }

        if (wifiIPAddress) break;
    }

    return wifiIPAddress;
}

const IP = getWifiIPAddress()

interface DownloadPieceInfo {
    infoHash: string
    fileName: string
    index: Number
}

class NOde {
    private ID: string | undefined
    private torrentDir: string = 'repository'
    private peerServer: Server
    private socketToPeers: Set<Socket> = new Set()
    private port: number | undefined
    private IP: string
    private webServer: WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000 });
    private peerConnections: { peerInfo: PeerInfo, socket: Socket }[] = []
    private downloadState: { [infohash: string]: { indexes: Number[], indexMapBuffer: Map<Number, Buffer>, outputPath: String, numOfPieces: Number } } = {}

    constructor(
        clientPort: number,
        IP: string | undefined,
        ID: string | undefined) {
        this.port = clientPort
        this.IP = IP || ''
        this.ID = ID

        this.listenFrontend()

        this.peerServer = createServer((socket) => {
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);


        })


        //Lắng nghe peer khác kết nối
        this.peerServer.listen(this.port, this.IP, () => {
            const address = this.peerServer.address()
            if (address && typeof address == 'object') {
                console.log(`Server is running at ${address.address}:${address.port}`);
            }
        })


        app.listen(process.env.API_APP_PORT, () => { })
    }

    //Nhận thông điệp từ frontend
    private listenFrontend() {
        this.webServer.on('connection', (ws: WebSocket) => {
            console.log('connect with frontend')
            ws.on('message', (message) => {
                const data = JSON.parse(message.toString())

                if (data.message === 'torrent') {
                    this.parseTorrentFile(ws, data.filePath)
                }

                if (data.message === 'create torrent') {
                    this.uploadFile(ws, this.createFileTorrent(ws, data.filePath, data.trackerURL, Number(data.pieceLength), data.name, data.outputTorrentPath))
                }

                if (data.message === 'download by torrent') {
                    this.downloadFile(ws, data.torrent, data.chosenFiles)
                }

                if (data.message === 'download by magnet link') {

                }

                if (data.message === SEND_PIECEINFOS_MSG) {

                }

                if (data.message === SEND_PIECEINFOS_MSG) {

                    let tmp = this.downloadState[data.peerInfo.infoHash].indexes
                    const outputPath = this.downloadState[data.peerInfo.infoHash].outputPath
                    const indexMapBuffer = this.downloadState[data.peerInfo.infoHash].indexMapBuffer
                    let recieved_index = data.indexs
                    tmp = Array.from(new Set([...tmp, ...recieved_index]))

                    const fileStream = require('fs')
                    if (tmp.length == this.downloadState[data.peerInfo.infoHash].numOfPieces) {
                        for (let index = 0; index < tmp.length; index++) {
                            fileStream.writeFileSync(outputPath, indexMapBuffer.get(index))

                        }
                    }
                }


            })

        })
    }

    private createFileTorrent = (
        ws: WebSocket,
        filePaths: string,
        trackerURL: string,
        pieceLength: number,
        name: string,
        outputTorrentPath: string) => {
        const fullPath = path.resolve(outputTorrentPath);
        console.log(`Torrent file created at: ${fullPath}`);

        const fileAndPath = path.join(outputTorrentPath, name); // Ensure you have a proper filename

        let torrentFile;
        createTorrent(filePaths, {
            announceList: [
                [trackerURL]
            ],
            pieceLength: pieceLength,
            name: name
        }, (err: Error | null, torrent: Buffer) => {
            if (err) {
                console.log(err)
                return
            }

            localStorage.setItem(parseTorrent(torrent).infoHash, outputTorrentPath)

            fs.writeFile(fileAndPath, torrent, (writeErr) => {
                if (writeErr) {
                    console.log(writeErr)
                    return
                }

                ws.send(JSON.stringify({
                    message: 'Create torrent successfully'
                }))

            })

            torrentFile = parseTorrent(torrent)

        })

        return torrentFile
    }

    private parseTorrentFile = (path: string) => {

        fs.readFile(path, (err, data) => {
            if (err) {
                console.error('Error reading torrent file', err)
                return
            }


            return parseTorrent(data);

            // this.connectToTracker(ws, torrent.announce[0], torrent)
        })

    }

    private uploadFile = async (ws: WebSocket, torrent: any) => {
        const tracker = torrent.announce[0]
        const [ip, port] = tracker.split(':')

        const socketToTracker = new Socket()

        socketToTracker.connect({
            port: Number(port),
            host: ip,
        }, () => {
            socketToTracker.write(JSON.stringify({
                message: 'upload',
                infoHash: torrent.infoHash,
                IP: this.IP,
                port: this.port,
                ID: this.ID
            }))
        });

    }

    private getInfoHashOfPeer = async () => {
        const torrentFileInfo: string[] = []

        const files = fs.readdirSync(this.torrentDir)

        files.forEach(async file => {
            if (file.endsWith('.torrent')) {
                const filePath = path.join(this.torrentDir, file);
                const data = fs.readFileSync(filePath);
                try {
                    const torrent = parseTorrent(data);
                    await torrentFileInfo.push(torrent.infoHash);
                } catch (e) {
                    console.log(e);
                }
            }
        })
        return torrentFileInfo
    }

    // type of torrent = type of function parseTorrent
    private getPeersFromTrackerAndConnect = (ws: WebSocket, socketToTracker: Socket, torrent: any, chosenFiles: any) => {
        socketToTracker.write(JSON.stringify({
            message: RETRIVE_PEERINFOS_MSG,
            infoHash: torrent.infoHash
        }))


        // Chon file cuoi cung , ch lam tai nhieu files :)) -> FUTURE TODO 
        let file: any;
        torrent.files.forEach((File: any, index: any) => {
            file = File
        });

        const fileSize = file.length
        const pieceSize = file.pieceLength // KB
        const numPieces = fileSize / pieceSize
        const realNumPieces = numPieces + fileSize % pieceSize

        this.peerServer.listen()
        socketToTracker.on('data', data => {
            const message = JSON.parse(data.toString())

            if (message.message === SEND_PIECEINFOS_MSG) {
                const peerHavingFiles: PeerInfo[] = message.peers
                const numParts = numPieces / peerHavingFiles.length

                //DIVIDE PIECES FOR PEERS AND REQUEST DOWNLOAD
                for (let i = 0; i < peerHavingFiles.length; i++) {
                    const peer = peerHavingFiles[i]
                    const start = i * numParts
                    const end = (i + 2) * numParts > realNumPieces ? realNumPieces : (i + 1) * numParts - 1
                    const chunkInfo: PieceDownloadInfo = {
                        name: file.path,
                        indexs: Array.from({ length: end - start + 1 }, (_, i) => start + i),
                        infoHash: torrent.infoHash,
                        pieceSize: pieceSize

                    }
                    const msg = { message: SEND_PIECEINFOS_MSG, chunkInfo: chunkInfo }

                    const buffer = Buffer.from(JSON.stringify(msg))
                    const socket = this.getConnections(peer)
                    socket.write(buffer, (error) => {
                        if (error) {
                            console.error('Error sending message:', error);
                        } else {
                            console.log(`Send chunks info (chunk list: ${chunkInfo.indexs.toString()}) to IP(${peer.IP}) - port (${peer.port})`);
                            socket.end();
                        }
                    })
                }
            }


            if (message.message === 'error') {
                ws.send(JSON.stringify({
                    message: message.message,
                    failure: message.failure
                }))
            }
        })

    }

    public connectToPeers = (IP: string, port: number) => {
        const socketToPeer = new Socket()

        socketToPeer.connect(port, IP, () => {
            console.log(`Connect to peer at ${IP}:${port}`)
            this.socketToPeers.add(socketToPeer)

            socketToPeer.on('data', (data) => {
                console.log(`Recieve file from ${IP}:${port}`)
            })

            socketToPeer.on('end', () => {
                this.socketToPeers.delete(socketToPeer)
            })
        })
    }


    // Type of torrent,chosenFiles : Buffer,Number
    private async downloadFile(ws: WebSocket, torrent: any, chosenFiles: any) {
        torrent = parseTorrent(torrent)

        const tracker = torrent.announce[0]
        const [ip, port] = tracker.split(':')
        const socketToTracker = new Socket()

        socketToTracker.connect({
            port: Number(port),
            host: ip,
        }, () => {
            socketToTracker.write(JSON.stringify({
                message: 'connect for downloading',
                IP: this.IP,
                port: this.port,
                ID: this.ID
            }))
        });

        await this.getPeersFromTrackerAndConnect(ws, socketToTracker, torrent, chosenFiles)


        socketToTracker.destroy()
        // INFOHASH + DIR OF DOWNLOADED FILE
        localStorage.setItem("", "");
    }
    private getConnections(peer: PeerInfo): Socket {
        for (let index = 0; index < this.peerConnections.length; index++) {
            if (this.peerConnections[index].peerInfo.isEqual(peer)) {
                return this.peerConnections[index].socket
            }
        }
        const socket = new Socket()
        socket.connect(peer.port, peer.IP, () => {
            console.log(`IP:${IP}-Port${this.port} connect sucessfully with IP:${peer.IP}-Port${peer.port}`)
        })
        return socket
    }

    private schedulePieceDownloads(torrent: any) {

    }

    private sendPiece(pieceInfo: PieceDownloadInfo, peerInfo: PeerInfo) {
        const torrentPath = localStorage.getItem(pieceInfo.infoHash.toString()) as string


        if (pieceInfo.indexs.length != 0) {
            getFilePieces(torrentPath, pieceInfo.pieceSize, pieceInfo.indexs)
                .then((chunks) => {
                    chunks.forEach((chunk, index) => {
                        const chunkinfo: PieceDownloadInfo = {
                            name: pieceInfo.name,
                            indexs: [index * pieceInfo.pieceSize],
                            infoHash: pieceInfo.infoHash,
                            pieceSize: pieceInfo.pieceSize
                        }
                        const msg = {
                            message: SEND_PIECEINFOS_MSG,
                            pieceInfo: chunkinfo,
                            buffer: chunk
                        }
                        const socket = this.getConnections(peerInfo)
                        socket.write(Buffer.from(JSON.stringify(msg)))
                        console.log(`Send piece :`, chunk, ` to IP:${peerInfo.IP}-port:${peerInfo.port}`);
                    });
                })
                .catch(console.error);
        }
    }
}

if (IP) new NOde(defaultPort, IP, peerID)