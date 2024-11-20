import { createServer, Server, Socket } from 'net'
import fs from 'fs'
import path, { basename, parse } from 'path'
import dotenv from 'dotenv'
import { app } from '../app';
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';
import { hostname, arch, platform } from 'os';
import crypto from 'crypto';
import { DownloadState, getConnections, PeerInfo, PieceDownloadInfo, portSendFile, SEND_PEERINFOS_MSG, SEND_DOWNLOAD_SIGNAL_MSG, SEND_PIECEDATAS_MSG, SEND_PIECEINFOS_MSG, server, SEND_SUCCESS_MSG, RECIEVED_PIECE_MSG } from '../model';
import { getFilePieces } from '../service';
import { Connection } from '../model';
import logger from '../../log/winston';
import { Logger } from 'concurrently';
import { error, log } from 'console';

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
if (IP) {
    logger.info(`Client run with IP-${IP}`)
}

interface DownloadPieceInfo {
    infoHash: string
    fileName: string
    index: Number
}

class NOde {
    private ID: string | undefined
    private torrentDir: string = 'repository'
    peerServer: Server
    private socketToPeers: Set<Socket> = new Set()
    private port: number | undefined
    private IP: string
    private webServer: WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000 });
    private ws: WebSocket | null = null;
    private peerConnections: Connection[] = []

    // Lưu trạng thái download 
    private downloads: { [infohash: string]: { downloadStates: DownloadState[] } } = {}

    constructor(
        clientPort: number,
        IP: string | undefined,
        ID: string | undefined) {
        this.port = clientPort
        this.IP = IP || ''
        this.ID = ID

        this.listenFrontend()

        this.peerServer = createServer((socket) => {
            logger.info(`Peer ${socket.remoteAddress}:${socket.remotePort} connect successfully`);
            socket.on('data', (data: string | any) => {
                let message: any
                try {
                    if (data.toString().length > 5000) {
                        // logger.info(data.toString())
                    }

                    const rawData = data.toString()

                    // console.log(rawData)
                    message = JSON.parse(rawData)

                    if (message.message === SEND_PIECEINFOS_MSG) {
                        logger.info(`Recieve download info from IP-${socket.remoteAddress} : pieceindex-[${message.pieceInfo.indices}] : fileName-${message.pieceInfo.name}]`)
                        this.sendPiece(message.pieceInfo, { IP: socket.remoteAddress, port: message.port, ID: 'peer1' } as PeerInfo)
                    }

                    if (message.message === SEND_PIECEDATAS_MSG) {
                        logger.info(`Recieve piece from peer IP:${socket.remoteAddress} - port:${socket.remotePort}`)

                        let pieceInfo = message.pieceInfo as PieceDownloadInfo
                        let downloadState = this.getOrCreateDownloadState(pieceInfo.infoHash, pieceInfo.name)

                        let current_index = downloadState.indexes
                        let recieved_index = pieceInfo.indices

                        let total_index = Array.from(new Set([...current_index, ...recieved_index])) as number[]
                        downloadState.indexes = total_index

                        const writeStream = fs.createWriteStream('repository/copy_' + pieceInfo.name);
                        console.log(`length of index: `, total_index.length, downloadState.maxSize)

                        // Check xem các piece đã đc gửi đầy đủ chưa
                        if (total_index.length === downloadState.maxSize) {
                            if (total_index.length === 1) {
                                writeStream.write(Buffer.from(message.buffer))
                                writeStream.end()
                            } else {
                                const indexMapBuffer = downloadState.indexMapBuffer
                                for (let index = 0; index < total_index.length; index++) {
                                    writeStream.write(indexMapBuffer.get(index))
                                }
                                writeStream.end()
                            }
                            logger.info(`Download file successfully`)
                        } else {
                            downloadState.indexMapBuffer.set(recieved_index[0], Buffer.from(message.buffer))
                        }
                        socket.write(SEND_SUCCESS_MSG)
                        logger.info(`Send piece successfully`)
                        this.sendPercentDownloadToFrontend(this.ws, total_index as number[], downloadState.maxSize as number)
                    }



                } catch (e) {
                    // logger.error('Something went wrong', e)
                    socket.write(JSON.stringify({
                        message: 'error',
                        failure: 'Something went wrong, please do it again'
                    }))
                }
            })
        })


        //Lắng nghe yeeu cau gui file
        this.peerServer.listen(portSendFile, () => {
            logger.info(`Receive sendfile signal`)
        })


        app.listen(process.env.API_APP_PORT, () => { })
    }

    //Nhận thông điệp từ frontend
    private listenFrontend() {
        this.webServer.on('connection', (ws: WebSocket) => {
            this.ws = ws
            logger.info('connect with frontend')
            ws.on('message', (message) => {
                const data = JSON.parse(message.toString())

                if (data.message === 'create torrent') {
                    this.uploadFile(ws, this.createFileTorrent(ws, data.filePath, data.trackerURL, Number(data.pieceLength), data.name, data.outputTorrentPath))
                }

                if (data.message === 'download by torrent') {
                    logger.info('get torrent file name from frontend')
                    this.downloadFile(ws, data.fileName, [0])
                }

                if (data.message === 'download by magnet link') {

                }
            })

        })
    }

    private sendPercentDownloadToFrontend(ws: WebSocket | null, indexes: number[], maxSize: number) {
        ws?.send(JSON.stringify({
            message: 'download by torrent',
            percent: Math.ceil(indexes.length * 100 / maxSize),
        }))
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

        // Chon file cuoi cung , ch lam tai nhieu files :)) -> FUTURE TODO 
        let file: any;
        torrent.files.forEach((File: any, index: any) => {
            file = File
        });

        const fileSize = file.length
        console.log("Function getPeersFrommTrackerAndConnect: Filesize :" + fileSize)
        const pieceSize = 17 * 1024 // KB
        console.log("Function getPeersFrommTracker and Connect: Piecelength :" + pieceSize)
        const numPieces = Math.ceil(fileSize / pieceSize)

        socketToTracker.on('data', data => {
            const message = JSON.parse(data.toString())
            logger.info('Get data from tracker')
            if (message.message === SEND_PEERINFOS_MSG) {
                const peerHavingFiles: PeerInfo[] = message.peers
                const numParts = Math.floor(numPieces / peerHavingFiles.length)

                logger.info(`GET info of ${peerHavingFiles.length} peers`)
                //DIVIDE PIECES FOR PEERS AND REQUEST DOWNLOAD
                this.getOrCreateDownloadState(torrent.infoHash, path.basename(file.path)).maxSize = numPieces
                for (let i = 0; i < peerHavingFiles.length; i++) {
                    const peer = peerHavingFiles[i]
                    const start = i * numParts
                    const end = ((i + 2) * numParts) > numPieces ? numPieces : ((i + 1) * numParts - 1)
                    const chunkInfo: PieceDownloadInfo = {
                        name: path.basename(file.path),
                        indices: Array.from({ length: end - start }, (_, i) => start + i),
                        infoHash: torrent.infoHash,
                        pieceSize: pieceSize

                    }
                    const msg = { message: SEND_PIECEINFOS_MSG, pieceInfo: chunkInfo, port: portSendFile }

                    const socket = getConnections(peer, this.peerConnections)
                    socket.write(JSON.stringify(msg), (error) => {
                        if (error) {
                            logger.error('Send downloadInfo fail:', error);
                        } else {
                            logger.info(`Send chunks info to IP(${peer.IP}) - port (${peer.port})`);
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
    public async downloadFile(ws: WebSocket, fileName: string, chosenFiles: any) {
        let torrent = fs.readFileSync('repository/' + fileName) as any
        torrent = parseTorrent(torrent)

        const tracker = torrent.announce[0]
        const [ip, port] = tracker.split(':')
        const socketToTracker = new Socket()

        try {
            socketToTracker.connect(server.port, server.IP, async () => {
                await socketToTracker.write(JSON.stringify({
                    message: SEND_DOWNLOAD_SIGNAL_MSG,
                    port: server.port,
                    infoHash: torrent.infoHash
                }))
            });
            await this.getPeersFromTrackerAndConnect(ws, socketToTracker, torrent, chosenFiles)
        } catch (error) {
            logger.error('Connect to tracker fail')
        }
    }

    private reschedulePieceDownloads(torrent: any) {

    }

    private async sendPiece(pieceInfo: PieceDownloadInfo, peerInfo: PeerInfo) {
        // const torrentPath = localStorage.getItem(pieceInfo.infoHash.toString()) as string
        const torrentPath = 'repository/' + pieceInfo.name
        let flag = false
        // MỘT PIECE CHO MỘT LẦN GỬI

        if (pieceInfo.indices.length != 0) {
            const socket = getConnections(peerInfo, this.peerConnections)

            const chunks = getFilePieces(torrentPath, pieceInfo.pieceSize, pieceInfo.indices);

            await this.sendPiecesSequentially(chunks, pieceInfo, socket, peerInfo);
        }


    }
    private async sendPiecesSequentially(
        chunks: Buffer[],
        pieceInfo: PieceDownloadInfo,
        socket: Socket,
        peerInfo: PeerInfo
    ) {
        socket.on('data', (data) => {
            const message = data.toString()
            // console.log(message)
            if (message === SEND_SUCCESS_MSG) {
                console.log('gui thanh cong')
                flag = true
            }
        })
        let flag = false
        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            const chunkinfo: PieceDownloadInfo = {
                name: pieceInfo.name,
                indices: [index],
                infoHash: pieceInfo.infoHash,
                pieceSize: pieceInfo.pieceSize
            };

            const msg = {
                message: SEND_PIECEDATAS_MSG,
                pieceInfo: chunkinfo,
                buffer: chunk
            };

            // Gửi dữ liệu qua socket
            socket.write(JSON.stringify(msg));

            // Chờ đến khi flag được đổi thành true
            await waitForChange(() => flag);

            // Đặt lại flag để sẵn sàng cho lần gửi tiếp theo
            flag = false;

            logger.info(`Send piece ${index} to IP:${peerInfo.IP}-port:${peerInfo.port}`);
        }
    }
    private getOrCreateDownloadState(infohash: string, fileName: string): DownloadState {
        // Check if the download entry for the infohash exists; if not, initialize it
        if (!this.downloads[infohash]) {
            this.downloads[infohash] = { downloadStates: [] };
        }

        // Look for an existing DownloadState with the given fileName
        let downloadState = this.downloads[infohash].downloadStates.find(state => state.fileName === fileName);

        // If no matching DownloadState is found, create a new one
        if (!downloadState) {
            downloadState = {
                indexes: [],
                indexMapBuffer: new Map(),
                fileName: fileName,
                numOfPieces: 0,
                maxSize: 0,
            };

            // Add the new DownloadState to the downloadStates array
            this.downloads[infohash].downloadStates.push(downloadState);
        }

        return downloadState;
    }
}

if (IP) {
    const node = new NOde(defaultPort, IP, peerID)
}

// async function waitUntilTrue(variable: () => boolean): Promise<void> {
//     return new Promise((resolve) => {
//         const interval = setInterval(() => {
//             if (variable()) {
//                 clearInterval(interval);
//                 resolve();
//             }
//         }, 100); // Check every 100ms
//     });
// }

function waitForChange(predicate: () => boolean, interval: number = 100): Promise<void> {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (predicate()) {
                clearInterval(checkInterval);
                resolve();
            }
        }, interval);
    });
}