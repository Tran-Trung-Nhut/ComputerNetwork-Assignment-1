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
import { DownloadState, FileInfo, PeerInfo, PieceDownloadInfo, portSendFile, SEND_DOWNLOAD_SIGNAL_MSG, SEND_PEERINFOS_MSG, SEND_PIECEDATAS_MSG, SEND_PIECEINFOS_MSG, SEND_SUCCESS_MSG } from './model';
import { Connection } from './model';
import { checkEqual2Peers, createPieceIndexsForPeers, extractIPv4, getAllPiecesFromOnlinedPieces, getConnections, getFilePieces, removeConnections, setPeerOffline } from './service';
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
    private tmpDatas: { [remoteIP: string]: { tmpData: string } } = {}


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

        // this.socketToTracker = new Socket()
        // try {
        //     this.socketToTracker.on('data', (data) => {
        //         const message = JSON.parse(data.toString())
        //         console.log(message)
        //         if (message.message === SEND_ALL_PEERINFOS_MSG) {
        //             this.ws?.send(message)
        //         }
        //     })
        //     this.socketToTracker.connect(server.port, server.IP)
        //     setInterval(() => {
        //         this.socketToTracker.write(JSON.stringify({
        //             message: REQUEST_ALL_PEERINFOS
        //         }))
        //     }, 1000)
        // } catch (error) {
        //     logger.error(`Connect to tracker fail or get data from tracker fail`)
        // }
        //Lắng nghe peer khác kết nối
        this.peerServer = createServer((socket) => {


            const remoteIP = extractIPv4(socket.remoteAddress as string)
            socket.setNoDelay(true)
            logger.info(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);
            socket.write(JSON.stringify({
                message: 'ID of server peer',
                ID: this.ID
            }))
            socket.on('data', (data: string | any) => {
                let message: any
                try {
                    let rawData = data.toString()
                    if (!(remoteIP in this.tmpDatas)) this.tmpDatas[remoteIP] = { tmpData: '' };
                    if (rawData[rawData.length - 1] != '}') {
                        this.tmpDatas[remoteIP].tmpData += rawData
                        return
                    } else {
                        rawData = this.tmpDatas[remoteIP].tmpData + rawData
                        this.tmpDatas[remoteIP].tmpData = ''
                    }
                    message = JSON.parse(rawData)


                    if (message.message === SEND_PIECEINFOS_MSG) {
                        logger.info(`Recieve download info from IP-${remoteIP} : port-${socket.remotePort} : pieceindex-[${message.pieceInfo.indices}] : fileName-${message.pieceInfo.file.name}]`)
                        this.sendPiece(message.pieceInfo, { IP: remoteIP, port: message.port, ID: 'peer1' } as PeerInfo)
                    }


                    if (message.message === SEND_PIECEDATAS_MSG) {
                        this.handleSendPicesdataMSG(socket, message)
                    }


                } catch (e) {
                    // logger.error('Something went wrong', e)
                    socket.write(JSON.stringify({
                        message: 'error',
                        failure: 'Something went wrong, please do it again'
                    }))
                }
            })


            socket.on('error', (err) => {
                logger.error(err.name + err.message)
                if (err.message.includes('ECONNRESET')) {
                    removeConnections({ IP: remoteIP, port: portSendFile, ID: '' }, this.peerConnections)
                    setPeerOffline(this.downloads, { IP: remoteIP, port: portSendFile, ID: '' })
                    logger.error(`Peer ${remoteIP} offline`)
                }
            });
        })

        this.peerServer.listen(portSendFile, () => {
            logger.info(`Server is running at ${this.IP}:${this.port}`);
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
            console.log('connect with frontend')
            ws.on('message', (message) => {
                const data = JSON.parse(message.toString())
                console.log(data)
                this.ws = ws
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


    private scheduleDownload = (ws: WebSocket | null, socketToTracker: Socket, infoHashofFile: any, file: FileInfo) => {
        if (!ws) {
            return
        }
        // Chon file cuoi cung , ch lam tai nhieu files :)) -> FUTURE TODO
        const fileSize = file.length
        console.log("Function getPeersFrommTrackerAndConnect: Filesize :" + fileSize)
        const pieceSize = file.pieceLength // KB
        console.log("Function getPeersFrommTracker and Connect: Piecelength :" + pieceSize)
        const numPieces = Math.ceil(fileSize / pieceSize)


        socketToTracker.on('data', data => {
            const message = JSON.parse(data.toString())
            logger.info('Get data from tracker')
            if (message.message === SEND_PEERINFOS_MSG) {
                const peerHavingFiles: PeerInfo[] = message.peers
                if (peerHavingFiles.length == 0) {
                    logger.error(`Not exist peer having this ${path.basename(file.path)}`)
                    return;
                }


                logger.info(`GET info of ${peerHavingFiles.length} peers`)
                //DIVIDE PIECES FOR PEERS AND REQUEST DOWNLOAD
                const downloadState = this.getOrCreateDownloadState(infoHashofFile, file)
                if (downloadState.indexes.length == 0) {
                    downloadState.maxSize = numPieces
                    downloadState.peers = peerHavingFiles.map((ele) => ({ info: ele, numPieces: 0, numDownloaded: 0, online: true }))
                }


                this.sendPieceInfo2Peers(numPieces, downloadState, file, infoHashofFile)
            }


            if (message.message === 'error') {
                ws.send(JSON.stringify({
                    message: message.message,
                    failure: message.failure
                }))
            }
        })


    }


    private reScheduleDownload(infoHashofFile: any, file: FileInfo, downloadState: DownloadState) {
        const fileSize = file.length
        const pieceSize = file.pieceLength // KB
        const numPieces = Math.ceil(fileSize / pieceSize)
        logger.info('Reschedule download')
        console.log(downloadState)
        this.sendPieceInfo2Peers(numPieces, downloadState, file, infoHashofFile)


    }




    private async sendPieceInfo2Peers(numPieces: number, downloadState: DownloadState, file: FileInfo, infoHashofFile: string) {
        const indices = Array.from({ length: numPieces }, (_, i) => i)
        const current_index = downloadState.indexes
        const result_indices = indices.filter(item => !current_index.includes(item))

        downloadState.maxSize = numPieces


        let numofPeers = 0
        downloadState.peers.forEach((ele) => {
            numofPeers += ele.online ? 1 : 0
        });
        const pieceIndices = createPieceIndexsForPeers(result_indices, numofPeers)
        logger.info('Schedule:' + pieceIndices)


        let flag = 0
        for (let i = 0; i < pieceIndices.length; i++) {
            const peer = downloadState.peers[i + flag]
            if (!peer.online) {
                flag++;
                i--;
                continue;
            }
            peer.numPieces = pieceIndices[i].length
            const chunkInfo: PieceDownloadInfo = {
                indices: pieceIndices[i],
                infoHash: infoHashofFile,
                file: file,
            }
            const msg = { message: SEND_PIECEINFOS_MSG, pieceInfo: chunkInfo, port: portSendFile }


            const socket = await getConnections(peer.info, this.peerConnections)
            socket.write(JSON.stringify(msg), (error) => {
                if (error) {
                    logger.error('Send downloadInfo fail:', error);
                } else {
                    logger.info(`Send chunks info to IP(${peer.info.IP}) - port (${peer.info.port})`);
                }
            })
        }
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
            socketToTracker.connect(port, ip, async () => {
                await socketToTracker.write(JSON.stringify({
                    message: SEND_DOWNLOAD_SIGNAL_MSG,
                    port: port,
                    infoHash: torrent.infoHash
                }))
            });
            let file: FileInfo | null = null;
            torrent.files.forEach((File: any, index: any) => {
                file = { name: File.name, path: File.path, length: File.length, pieceLength: torrent.pieceLength }
            });
            if (file) await this.scheduleDownload(ws, socketToTracker, torrent.infoHash, file)
            else logger.error('No files found in the torrent');


        } catch (error) {
            logger.error('Connect to tracker fail')
        }
    }
    private async sendPiece(pieceInfo: PieceDownloadInfo, peerInfo: PeerInfo) {
        // const torrentPath = localStorage.getItem(pieceInfo.infoHash.toString()) as string
        const torrentPath = 'repository/' + pieceInfo.file.path
        let flag = false
        // MỘT PIECE CHO MỘT LẦN GỬI
        if (pieceInfo.indices.length != 0) {
            const socket = await getConnections(peerInfo, this.peerConnections)
            const chunks = getFilePieces(torrentPath, pieceInfo.file.pieceLength, pieceInfo.indices);
            await this.sendPiecesSequentially(chunks, pieceInfo, socket, peerInfo, pieceInfo.indices, pieceInfo.file);
        }


    }
    private async sendPiecesSequentially(
        chunks: Buffer[],
        pieceInfo: PieceDownloadInfo,
        socket: Socket,
        peerInfo: PeerInfo,
        indices: number[],
        file: any
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
                indices: [indices[index]],
                infoHash: pieceInfo.infoHash,
                file: file
            };




            const msg = {
                message: SEND_PIECEDATAS_MSG,
                pieceInfo: chunkinfo,
                buffer: chunk
            };


            // Gửi dữ liệu qua socket
            socket.write(Buffer.from(JSON.stringify(msg)));
            console.log('send file')




            // Chờ đến khi flag được đổi thành true
            await waitForChange(() => flag);
            // Đặt lại flag để sẵn sàng cho lần gửi tiếp theo
            flag = false;


            logger.info(`Send piece ${indices[index]} to IP:${peerInfo.IP}-port:${peerInfo.port}`);
        }
    }
    private sendPercentDownloadToFrontend(ws: WebSocket | null, indexes: number[], maxSize: number) {
        console.log(Math.ceil(indexes.length * 100 / maxSize))
        this.ws?.send(JSON.stringify({
            message: 'percent',
            percent: Math.ceil(indexes.length * 100 / maxSize),
        }))
    }
    private sendSuccessDownSignal(ws: WebSocket | null) {
        ws?.send(JSON.stringify({
            message: 'download successfully',
        }))
    }
    private getOrCreateDownloadState(infohash: string, file: FileInfo): DownloadState {
        // Check if the download entry for the infohash exists; if not, initialize it
        if (!this.downloads[infohash]) {
            this.downloads[infohash] = { downloadStates: [] };
        }
        // Look for an existing DownloadState with the given fileName
        let downloadState = this.downloads[infohash].downloadStates.find(state => state.file.path === file.path);
        // If no matching DownloadState is found, create a new one
        if (!downloadState) {
            downloadState = {
                indexes: [],
                indexMapBuffer: new Map(),
                file: { name: file.name, length: file.length, path: file.path, pieceLength: file.pieceLength },
                maxSize: 0,
                peers: []
            };
            // Add the new DownloadState to the downloadStates array
            this.downloads[infohash].downloadStates.push(downloadState);
        }
        return downloadState;
    }
    private handleSendPicesdataMSG(socket: Socket, message: any) {
        logger.info(`Recieve piece from peer IP:${socket.remoteAddress} - port:${socket.remotePort}`)
        const remoteIP = extractIPv4(socket.remoteAddress)
        let pieceInfo = message.pieceInfo as PieceDownloadInfo
        let downloadState = this.getOrCreateDownloadState(pieceInfo.infoHash, pieceInfo.file)
        downloadState.peers.forEach((ele, idx) => {
            if (ele.info.IP === remoteIP) {
                downloadState.peers[idx].numDownloaded++
            }
        })


        let current_index = downloadState.indexes
        let recieved_index = pieceInfo.indices
        let total_index = Array.from(new Set([...current_index, ...recieved_index])) as number[]
        downloadState.indexes = total_index
        downloadState.indexMapBuffer.set(recieved_index[0], Buffer.from(message.buffer))


        console.log(`length of index: `, total_index.length, downloadState.maxSize)
        // Check xem các piece đã đc gửi đầy đủ chưa
        if (total_index.length === downloadState.maxSize) {
            const writeStream = fs.createWriteStream('repository/copy_' + pieceInfo.file.name);
            writeStream.on('finish', () => {
                logger.info(`Download file successfully`);
            });


            // Handle errors if any occur
            writeStream.on('error', (err) => {
                console.error('Error writing file:', err);
            });
            if (total_index.length === 1) {
                writeStream.write(Buffer.from(message.buffer))
            } else {
                const indexMapBuffer = downloadState.indexMapBuffer
                for (let index = 0; index < total_index.length; index++) {
                    writeStream.write(indexMapBuffer.get(index))
                    console.log(index)
                }
                console.log('???????????????')
            }
            writeStream.end();
            logger.info(`Download file successfully`)
        } else if (getAllPiecesFromOnlinedPieces(downloadState)) {
            this.reScheduleDownload(pieceInfo.infoHash, pieceInfo.file, downloadState)
        }
        socket.write(SEND_SUCCESS_MSG)
        logger.info(`Send piece successfully`)
        this.sendPercentDownloadToFrontend(this.ws, total_index as number[], downloadState.maxSize as number)
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





