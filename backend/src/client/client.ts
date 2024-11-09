import { createServer, Server, Socket } from 'net'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { app } from '../app';  
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';
import { hostname, arch, platform } from 'os';
import crypto from 'crypto';
import { FileDto } from '../dtos/file.dto';
import { PeerDto } from '../dtos/peer.dto';

const generatePeerID = (): string => {
    const deviceInfo = `${hostname()}-${arch()}-${platform()}`;
    return crypto.createHash('sha256').update(deviceInfo).digest('hex');
};

const peerID = generatePeerID();

dotenv.config()

const parseTorrent = require('parse-torrent')
const createTorrent = require('create-torrent')

let defaultPort:number = 5678

function getWifiIPAddress() {
    const networkInterface : any = networkInterfaces();
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

class NOde{
    private ID : string | undefined
    private torrentDir: string = 'repository'
    private downloadOutput: string = 'repository'
    private storageDir: string = 'localStorage'
    private localStoragePeer: string
    private localStorageFile: string
    private peerServer: Server
    private socketToTracker: Socket = new Socket()
    private socketToPeers: Set<Socket> = new Set()
    private port: number | undefined
    private IP : string
    private webServer : WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000});
    private fileSeeding: FileDto[] = []
    private connectedPeer: PeerDto[] = []

    constructor(
    clientPort: number,
    IP: string | undefined,
    ID: string | undefined){
        this.port = clientPort
        this.IP = IP || ''
        this.ID = ID
        this.localStoragePeer = this.ID + '-peer.json'
        this.localStorageFile = this.ID + '-file.json'


        this.checkPeerDatabase()

        this.listenFrontend()

        this.peerServer = createServer((socket) => {
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);
            socket.write(JSON.stringify({
                message: 'ID of server peer',
                ID: this.ID
            }))
        })
        
        
        //Lắng nghe peer khác kết nối
        this.peerServer.listen(this.port, this.IP, () => {
            const address = this.peerServer.address()
            if(address && typeof address == 'object'){
                console.log(`Server is running at ${address.address}:${address.port}`);
            }
        })


        app.listen(process.env.API_APP_PORT, () => {})
    }
    
    private checkPeerDatabase = async () => {
        if(!this.ID) return

        fs.readdir(this.storageDir, (err, files) => {
            if(err){
                console.log('Error in storage')
                return
            }

            if(!files.includes(this.localStoragePeer)){

                const filePath = path.join(this.storageDir, this.localStoragePeer);

                fs.writeFile(filePath, '', (err) => {
                    if (err) {
                        console.error('Error in create storage', err);
                        return;
                    }
                });
            }

            if(!files.includes(this.localStorageFile)){

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

    private initialize = async ( ) => {
        this.fileSeeding = await this.getFileSeeding();
        this.connectedPeer = await this.getPeersFromFile();
    }

    private getPeersFromFile = async ():Promise<PeerDto[]> => {
        if(!this.ID) return []
        const connected: PeerDto[] = []

        try{

            const peers = await this.loadFromFile(path.join(this.storageDir,this.localStoragePeer))
            if(!peers) return []

            for(const peer of peers){
                await connected.push({
                    ID: peer.ID,
                    status: 'offline',
                    lastConnect: peer.lastConnect
                })
            }
        }catch(e){
            console.log('fail 3')
        }
        return connected
    }

    private loadFromFile = async(filePath: string) => {
        if(!fs.existsSync(filePath)) return []

        const data = fs.readFileSync(filePath, 'utf8')

        const message = JSON.parse(data)

        return message
    }

    private loadToFile = async (filePath: string, data: any) => {
        fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
    }

    private getFileSeeding = async ():Promise<FileDto[]> => {
        const torrentFiles: string[] = []
        const fileSeedings: FileDto[] = []
        const db = await this.loadFromFile(this.localStorageFile)

        const files = fs.readdirSync(this.torrentDir)
        
        await files.forEach(async file => {
            if(file.endsWith('.torrent')){
                torrentFiles.push(file)
            }
        })

        for(const torrentFile of torrentFiles) {
            for(const f of files) {
                const fileNameWithoutExt = path.parse(f).name

                if(!f.endsWith('.torrent') && torrentFile.includes(fileNameWithoutExt)){
                    try{
                        if(!this.ID) break

                        let exist: boolean = false

                        for(const record of db){
                            if(record.name === f){
                                fileSeedings.push({
                                    name: record.name,
                                    completedFile: record.completedFile,
                                    uploadTime: record.uploadTime
                                })
                                exist = true
                                break
                            }
                        }

                        if(!exist){
                            fileSeedings.push({
                                name: f,
                                uploadTime: 0,
                                completedFile: 100
                            })
                        }
                    
                    }catch(e){
                        console.log('fail 1')
                    }
                }
            }
        }
        await this.loadToFile(path.join(this.storageDir, this.localStorageFile), fileSeedings)

        return fileSeedings
    }

    //Nhận thông điệp từ frontend
    private listenFrontend () {
        this.webServer.on('connection', async (ws: WebSocket) => {
            await this.initialize()
            console.log('connect with frontend')     

            ws.on('message',(message) => {
                const data = JSON.parse(message.toString())

                if(data.message === 'torrent'){
                    this.parseTorrentFile(ws, data.filePath)
                }

                if(data.message === 'create torrent'){
                    this.createFileTorrent(ws, data.filePath, data.trackerURL, Number(data.pieceLength), data.name, data.outputTorrentPath)
                }

                if(data.messgae === 'change downloadOutput'){
                    this.downloadOutput = data.downloadOutput
                }

                if(data.message === 'refresh Files'){
                    ws.send(JSON.stringify({
                        message:  'refresh Files',
                        fileSeeding: this.fileSeeding
                    }))
                }

                
                if(data.message === 'refresh Peers'){
                    ws.send(JSON.stringify({
                        message:  'refresh Peers',
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
        },(err: Error | null, torrent: Buffer) => {
            if(err){
                console.log(err)
                return
            }

            fs.writeFile(fileAndPath, torrent, async (writeErr) => {
                if(writeErr){
                    console.log(writeErr)
                    return
                }

                if(filePaths.includes(fullPath) && this.ID){
                    this.fileSeeding.push({
                        name: name,
                        uploadTime: 0,
                        completedFile: 100,
                    })

                    await this.loadToFile(path.join(this.storageDir,this.localStorageFile), this.fileSeeding)

                    if(this.socketToTracker.connecting ) {
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
            if(err){
                console.error('Error reading torrent file', err)
                return
            }

        
            const torrent = parseTorrent(data);    
            
            this.connectToTracker(ws, torrent.announce[0], torrent)
        })

    }

    private  connectToTracker = async (ws:WebSocket, tracker: string, torrent: any) =>{
        const [ip, port] = tracker.split(':')

        this.socketToTracker.connect({
            port: Number(port), 
            host: ip,
        }, async () => {
            const infoHashOfPeer = await this.getInfoHashOfPeer()

            this.socketToTracker.write(JSON.stringify({
                message: 'infohash of peer',
                infoHashOfPeer: infoHashOfPeer,
                IP: this.IP,
                port: this.port,
                ID: this.ID
            }))
        });

        this.getPeersFromTrackerAndConnect(ws, this.socketToTracker, torrent)
    }
    
    private getInfoHashOfPeer = async () => {
        const torrentFiles: string[] = []
        const torrentFileInfos: string[] = []

        const files = fs.readdirSync(this.torrentDir)
        
        await files.forEach(async file => {
            if(file.endsWith('.torrent')){
                torrentFiles.push(file)
            }
        })

        torrentFiles.forEach(async torrentFile => {
            for(const file of files) {
                const fileNameWithoutExt = path.parse(file).name

                if(!file.endsWith('.torrent') && torrentFile.includes(fileNameWithoutExt)){
    
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

    private getPeersFromTrackerAndConnect = (ws: WebSocket, socketToTracker: Socket, torrent: any) => {
        socketToTracker.write(JSON.stringify({
            message: 'infoHash',
            infoHash: torrent.infoHash
        }))

        socketToTracker.on('data', data => {
            const message = JSON.parse(data.toString())

            if(message.message === 'peers'){
                message.peers.forEach((peer: {IP: string, port: number, ID: string}) => {
                    if(peer.ID !== this.ID){
                        this.connectToPeers(ws, peer.IP, Number(peer.port))
                    }
                });
            }


            if(message.message === 'error'){
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

                if(message.message === 'ID of server peer'){
                    this.insertPeerConnectPeerDB(ws, message.ID)
                }
            })

            socketToPeer.on('end', () => {
                this.socketToPeers.delete(socketToPeer)
            })
        })
    }

    private insertPeerConnectPeerDB = async (ws: WebSocket, ID: string) => {
        
        try{
            for(let peer of this.connectedPeer){
                if(peer.ID === ID){
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

            this.loadToFile(path.join(this.storageDir,this.localStoragePeer), this.connectedPeer)
        }catch(e){
            console.log('fail 2')
        }
    }
}

if(IP) new NOde(defaultPort, IP, peerID)

