import { createServer, Server, Socket } from 'net'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { app } from './app';
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';
import { hostname, arch, platform } from 'os';
import crypto from 'crypto';
import { FileDto } from './dtos/file.dto';
import { PeerDto } from './dtos/peer.dto';
import logger from '../log/winston';
import { DownloadState, getConnections, PeerInfo, PieceDownloadInfo, portSendFile, SEND_DOWNLOAD_SIGNAL_MSG, SEND_PEERINFOS_MSG, SEND_PIECEDATAS_MSG, SEND_SUCCESS_MSG, server } from './model';
import { Connection } from './model';
import { getFilePieces } from './service';
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

class NOde {
    private ID: string | undefined
    private torrentDir: string = 'repository'
    private downloadOutput: string = 'repository'
    private storageDir: string = 'localStorage'
    private localStoragePeer: string
    private localStorageFile: string
    private peerServer: Server
    private socketToTracker: Socket = new Socket()
    private socketToPeers: Set<Socket> = new Set()
    private port: number | undefined
    private IP: string
    private webServer: WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000 });
    private fileSeeding: FileDto[] = []
    private connectedPeer: PeerDto[] = []
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
        this.localStoragePeer = this.ID + '-peer.json'
        this.localStorageFile = this.ID + '-file.json'


        this.checkPeerDatabase()

        this.listenFrontend()


        //Lắng nghe peer khác kết nối
        this.peerServer = createServer((socket) => {
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);
            socket.write(JSON.stringify({
                message: 'ID of server peer',
                ID: this.ID
            }))
            logger.info(`Peer ${socket.remoteAddress}:${socket.remotePort} connect successfully`);
            socket.on('data', (data: string | any) => {
                let message: any
                try {

                    const rawData = data.toString()
                    message = JSON.parse(rawData)

                    if (message.message === SEND_PEERINFOS_MSG) {
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

        this.peerServer.listen(this.port, this.IP, () => {
            const address = this.peerServer.address()
            if (address && typeof address == 'object') {
                console.log(`Server is running at ${address.address}:${address.port}`);
            }
        })
        this.peerServer.listen(portSendFile, () => {
            logger.info(`Receive sendfile signal`)
        })
        app.listen(process.env.API_APP_PORT, () => { })
    }

    private checkPeerDatabase = async () => {
        if (!this.ID) return

        fs.readdir(this.storageDir, (err, files) => {
            if (err) {
                console.log('Error in storage')
                return
            }

            if (!files.includes(this.localStoragePeer)) {

                const filePath = path.join(this.storageDir, this.localStoragePeer);

                fs.writeFile(filePath, '', (err) => {
                    if (err) {
                        console.error('Error in create storage', err);
                        return;
                    }
                });
            }

            if (!files.includes(this.localStorageFile)) {

                const filePath = path.join(this.storageDir, this.localStorageFile);

                fs.writeFile(filePath, '', (err) => {
                    if (err) {
                        console.error('Error in create storage', err);
                        return;
                    }
                });
            }
        })
    }

    private initialize = async () => {
        try {
            this.fileSeeding = await this.getFileSeeding();
            this.connectedPeer = await this.getPeersFromFile();
        } catch (error) {
            console.error("Error initializing node:", error);
        }
    }

    private getPeersFromFile = async (): Promise<PeerDto[]> => {
        if (!this.ID) return []

        if (this.connectedPeer.length > 0) return this.connectedPeer

        const connected: PeerDto[] = []

        try {

            const peers = await this.loadFromFile(path.join(this.storageDir, this.localStoragePeer))
            if (!peers) return []

            for (const peer of peers) {
                await connected.push({
                    ID: peer.ID,
                    status: 'offline',
                    lastConnect: peer.lastConnect
                })
            }
        } catch (e) {
            console.log('fail 3')
        }
        return connected
    }

    private loadFromFile = async (filePath: string) => {
        if (!fs.existsSync(filePath)) return []

        const data = fs.readFileSync(filePath, 'utf8')

        if (!data.trim()) {
            console.log('File is empty or only contains whitespace')
            return []
        }

        try {
            const message = JSON.parse(data)
            return message
        } catch (error) {
            console.log('Failed to parse JSON:', error)
            return []  // Return an empty array or handle it as necessary
        }
    }

    private loadToFile = async (filePath: string, data: any) => {
        fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
    }

    private getFileSeeding = async (): Promise<FileDto[]> => {
        const torrentFiles: string[] = []
        const fileSeedings: FileDto[] = []
        const db = await this.loadFromFile(this.localStorageFile)

        const files = fs.readdirSync(this.torrentDir)

        await files.forEach(async file => {
            if (file.endsWith('.torrent')) {
                torrentFiles.push(file)
            }
        })

        for (const torrentFile of torrentFiles) {
            for (const f of files) {
                const fileNameWithoutExt = path.parse(f).name

                if (!f.endsWith('.torrent') && torrentFile.includes(fileNameWithoutExt)) {
                    try {
                        if (!this.ID) break

                        let exist: boolean = false

                        for (const record of db) {
                            if (record.name === f) {
                                fileSeedings.push({
                                    name: record.name,
                                    completedFile: record.completedFile,
                                    uploadTime: record.uploadTime
                                })
                                exist = true
                                break
                            }
                        }

                        if (!exist) {
                            fileSeedings.push({
                                name: f,
                                uploadTime: 0,
                                completedFile: 100
                            })
                        }

                    } catch (e) {
                        console.log('fail 1')
                    }
                }
            }
        }
        await this.loadToFile(path.join(this.storageDir, this.localStorageFile), fileSeedings)

        return fileSeedings
    }

    //Nhận thông điệp từ frontend
    private listenFrontend() {
        this.webServer.on('connection', async (ws: WebSocket) => {
            await this.initialize()
            this.ws = ws
            console.log('connect with frontend')

            ws.on('message', (message) => {
                const data = JSON.parse(message.toString())
                console.log(data)

                if (data.message === 'torrent') {
                    this.parseTorrentFile(ws, data.filePath)
                }

                if (data.message === 'create torrent') {
                    this.createFileTorrent(ws, data.filePath, data.trackerURL, Number(data.pieceLength), data.name, data.outputTorrentPath)
                }

                if (data.message === 'change downloadOutput') {
                    this.downloadOutput = data.downloadOutput
                }

                if (data.message === 'refresh Files') {
                    ws.send(JSON.stringify({
                        message: 'refresh Files',
                        fileSeeding: this.fileSeeding
                    }))
                }
                if (data.message === 'download by torrent') {
                    logger.info('get torrent file name from frontend')
                    this.downloadFile(ws, data.fileName, [0])
                }

                if (data.message === 'refresh Peers') {
                    ws.send(JSON.stringify({
                        message: 'refresh Peers',
                        connectedPeer: this.connectedPeer
                    }))
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

        const fileAndPath = path.join(outputTorrentPath, name); // Ensure you have a proper filename

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

            fs.writeFile(fileAndPath, torrent, async (writeErr) => {
                if (writeErr) {
                    console.log(writeErr)
                    return
                }

                if (filePaths.includes(fullPath) && this.ID) {
                    this.fileSeeding.push({
                        name: name,
                        uploadTime: 0,
                        completedFile: 100,
                    })

                    await this.loadToFile(path.join(this.storageDir, this.localStorageFile), this.fileSeeding)

                    if (this.socketToTracker.connecting) {
                        const torrentJSON = await parseTorrent(torrent)

                        this.socketToTracker.write(JSON.stringify({
                            message: 'Update infoHash',
                            infoHash: torrentJSON.infoHash,
                            ID: this.ID,
                            IP: this.IP,
                            port: this.port,
                        }))
                    }
                }

                ws.send(JSON.stringify({
                    message: 'Create torrent successfully'
                }))
            })
        })
    }

    private parseTorrentFile = (ws: WebSocket, path: string) => {

        fs.readFile(path, (err, data) => {
            if (err) {
                console.error('Error reading torrent file', err)
                return
            }


            try {
                const torrent = parseTorrent(data);
                this.connectToTracker(ws, torrent.announce[0], torrent);
            } catch (parseError) {
                console.error('Error parsing torrent data', parseError);
            }
        })

    }

    private connectToTracker = async (ws: WebSocket, tracker: string, torrent: any) => {
        const [ip, port] = tracker.split(':')

        if (!this.socketToTracker.destroyed && !this.socketToTracker.connecting) {
            this.socketToTracker.connect({ port: Number(port), host: ip }, async () => {
                const infoHashOfPeer = await this.getInfoHashOfPeer()

                this.socketToTracker.write(JSON.stringify({
                    message: 'infohash of peer',
                    infoHashOfPeer: infoHashOfPeer,
                    IP: this.IP,
                    port: this.port,
                    ID: this.ID
                }))
            });
        } else {
            console.log("Socket already connected or connecting.");
        }


        // this.getPeersFromTrackerAndConnect(ws, this.socketToTracker, torrent)
    }

    private getInfoHashOfPeer = async () => {
        const torrentFiles: string[] = []
        const torrentFileInfos: string[] = []

        const files = fs.readdirSync(this.torrentDir)

        for (const file of files) {
            if (file.endsWith('.torrent')) {
                torrentFiles.push(file)
            }
        }

        torrentFiles.forEach(async torrentFile => {
            for (const file of files) {
                const fileNameWithoutExt = path.parse(file).name

                if (!file.endsWith('.torrent') && torrentFile.includes(fileNameWithoutExt)) {

                    const filePath = path.join(this.torrentDir, torrentFile);

                    const data = fs.readFileSync(filePath);
                    try {
                        const torrent = await parseTorrent(data);

                        torrentFileInfos.push(torrent.infoHash);
                    } catch (e) {
                        console.log('fail 1');
                    }
                    break
                }
            }
        })

        return torrentFileInfos
    }

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
                    const msg = { message: SEND_PEERINFOS_MSG, pieceInfo: chunkInfo, port: portSendFile }

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

    public connectToPeers = (ws: WebSocket, IP: string, port: number) => {
        const socketToPeer = new Socket()

        socketToPeer.connect(port, IP, () => {
            console.log(`Connect to peer at ${IP}:${port}`)
            this.socketToPeers.add(socketToPeer)

            socketToPeer.on('data', (data) => {
                const message = JSON.parse(data.toString())

                if (message.message === 'ID of server peer') {
                    this.insertPeerConnectPeerDB(ws, message.ID)
                }
            })

            socketToPeer.on('end', () => {
                socketToPeer.removeAllListeners();
                this.socketToPeers.delete(socketToPeer)
            })
        })
    }

    private insertPeerConnectPeerDB = async (ws: WebSocket, ID: string) => {

        try {
            for (let peer of this.connectedPeer) {
                if (peer.ID === ID) {
                    peer.status = 'online'

                    ws.send(JSON.stringify({
                        message: 'Update connectedPeer',
                        connectedPeer: this.connectedPeer
                    }))

                    return
                }
            }

            await this.connectedPeer.push({
                ID: ID,
                status: 'online',
                lastConnect: new Date()
            })

            ws.send(JSON.stringify({
                message: 'Update connectedPeer',
                connectedPeer: this.connectedPeer
            }))

            this.loadToFile(path.join(this.storageDir, this.localStoragePeer), this.connectedPeer)
        } catch (e) {
            console.log('fail 2')
        }
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


    private sendPercentDownloadToFrontend(ws: WebSocket | null, indexes: number[], maxSize: number) {
        ws?.send(JSON.stringify({
            message: 'download by torrent',
            percent: Math.ceil(indexes.length * 100 / maxSize),
        }))
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

if (IP) new NOde(defaultPort, IP, peerID)

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