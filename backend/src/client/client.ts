import { createServer, Server, Socket } from 'net'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { app } from '../app';  
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';
import { hostname, arch, platform } from 'os';
import crypto from 'crypto';
import { db } from '../db/db';
import { file, peer, peerConnectPeer } from '../db/schema';
import { and, eq, or } from 'drizzle-orm';
import { FileDto } from '../dtos/file.dto';

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
    private peerServer: Server
    private socketToTracker: Socket = new Socket()
    private socketToPeers: Set<Socket> = new Set()
    private port: number | undefined
    private IP : string
    private webServer : WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000});
    private fileSeeding: FileDto[] = []
    private connectedPeer: {ID: string, status: string}[] = []

    constructor(
    clientPort: number,
    IP: string | undefined,
    ID: string | undefined){
        this.port = clientPort
        this.IP = IP || ''
        this.ID = ID

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

        const existPeer = await db
        .select()
        .from(peer)
        .where(eq(peer.ID, this.ID))

        if(!existPeer || existPeer.length > 0) return

        await db
        .insert(peer)
        .values({
            ID: this.ID
        })
    }

    private initialize = async ( ) => {
        this.fileSeeding = await this.getFileSeeding();
        this.connectedPeer = await this.getConnectedPeers();
    }

    private getConnectedPeers = async () => {
        if(!this.ID) return []
        const connected: {ID: string, status: string}[] = []

        try{
            const peers = await db
            .select()
            .from(peerConnectPeer)
            .where(or(eq(peerConnectPeer.peerID1, this.ID),eq(peerConnectPeer.peerID2, this.ID)))

            if(peers.length === 0) return []

            for(const peer of peers){
                if(peer.peerID1 === this.ID){
                    await connected.push({
                        ID: peer.peerID2,
                        status: 'off'
                    })
                }

                if(peer.peerID1 === this.ID){
                    await connected.push({
                        ID: peer.peerID2,
                        status: 'off'
                    })
                }
            }
        }catch(e){

        }
        return connected
    }

    private getFileSeeding = async ():Promise<FileDto[]> => {
        const torrentFiles: string[] = []
        const fileSeedings: FileDto[] = []

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

                    const existFile = await db
                    .select({
                        name: file.name,
                        uploadTime: file.uploadTime,
                        completedFile: file.completedFile,
                        peerID: file.peerID
                    })
                    .from(file)
                    .where(and(eq(file.peerID, this.ID), eq(file.name,f)))

                    if(!existFile || existFile.length === 0){
                        const newFile = await db
                        .insert(file)
                        .values({
                            name: f,
                            uploadTime: 0,
                            completedFile: 100,
                            peerID: this.ID
                        })
                        .returning({
                            name: file.name,
                            uploadTime: file.uploadTime,
                            completedFile: file.completedFile,
                            peerID: file.peerID
                        })

                        if(!newFile || newFile.length === 0){
                            console.log('error create new file to database')
                            break
                        }
                        await fileSeedings.push(newFile[0])
                    }else{
                        fileSeedings.push(existFile[0])
                    }
                    }catch(e){
                        // console.log(e)
                    }
                }
            }
        }

        return fileSeedings
    }

    //Nhận thông điệp từ frontend
    private listenFrontend () {
        this.webServer.on('connection', async (ws: WebSocket) => {
            await this.initialize()
            console.log('connect with frontend')     
            
            ws.send(JSON.stringify({
                message: 'initialize',
                infoHashOfPeer: this.fileSeeding,
                connectedPeer: this.connectedPeer
            }))  

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
                    try{
                        await db
                        .insert(file)
                        .values({
                            name: name,
                            uploadTime: 0,
                            completedFile: 100,
                            peerID: this.ID
                        })
                        .returning({
                            name: file.name,
                            uploadTime: file.uploadTime,
                            completedFile: file.completedFile,
                            peerID: file.peerID
                        })

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

                    }catch(e){
                        //
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
                        console.log(e);
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
                        this.connectToPeers(peer.IP, Number(peer.port))
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

    public connectToPeers = (IP: string, port: number) => {
        const socketToPeer = new Socket()

        socketToPeer.connect(port, IP, () => {
            console.log(`Connect to peer at ${IP}:${port}`)
            this.socketToPeers.add(socketToPeer)

            socketToPeer.on('data', (data) => {
                const message = JSON.parse(data.toString())

                if(message.message === 'ID of server peer'){
                    this.insertPeerConnectPeerDB(message.ID)
                }
            })

            socketToPeer.on('end', () => {
                this.socketToPeers.delete(socketToPeer)
            })
        })
    }

    private insertPeerConnectPeerDB = async (ID: string) => {
        if(!this.ID) return 
        
        try{
            const exist = await db
            .select()
            .from(peerConnectPeer)
            .where(or(
                and(eq(peerConnectPeer.peerID1,this.ID), eq(peerConnectPeer.peerID2,ID)),
                and(eq(peerConnectPeer.peerID1,ID), eq(peerConnectPeer.peerID2,this.ID))))

            if(exist.length > 0 || exist) {
                for(let peer of this.connectedPeer){
                    if(peer.ID === ID){
                        peer.status = 'online'
                        return
                    }
                }
            }

            await this.connectedPeer.push({
                ID: ID,
                status: 'online'
            })

            return await db
            .insert(peerConnectPeer)
            .values({
                peerID1: this.ID,
                peerID2: ID
            })

        }catch(e){

        }
    }
}

if(IP) new NOde(defaultPort, IP, peerID)

