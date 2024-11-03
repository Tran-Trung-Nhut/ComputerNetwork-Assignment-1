import { createServer, Server, Socket } from 'net'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { app } from '../app';  
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';
import { hostname, arch, platform } from 'os';
import crypto from 'crypto';

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
    private peerServer: Server
    private socketToPeers: Set<Socket> = new Set()
    private port: number | undefined
    private IP : string
    private webServer : WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000});

    constructor(
    clientPort: number,
    IP: string | undefined,
    ID: string | undefined){
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
            if(address && typeof address == 'object'){
                console.log(`Server is running at ${address.address}:${address.port}`);
            }
        })


        app.listen(process.env.API_APP_PORT, () => {})
    }

    //Nhận thông điệp từ frontend
    private listenFrontend () {
        this.webServer.on('connection', (ws: WebSocket) => {
            console.log('connect with frontend')       
            ws.on('message',(message) => {
                const data = JSON.parse(message.toString())

                if(data.message === 'torrent'){
                    this.parseTorrentFile(ws, data.filePath)
                }

                if(data.message === 'create torrent'){
                    this.createFileTorrent(ws, data.filePath, data.trackerURL, Number(data.pieceLength), data.name, data.outputTorrentPath)
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

            fs.writeFile(fileAndPath, torrent, (writeErr) => {
                if(writeErr){
                    console.log(writeErr)
                    return
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

        const socketToTracker = new Socket()

        socketToTracker.connect({
            port: Number(port), 
            host: ip,
        }, async () => {
            const infoHashOfPeer = await this.getInfoHashOfPeer()
            socketToTracker.write(JSON.stringify({
                message: 'infohash of peer',
                infoHashOfPeer: infoHashOfPeer,
                IP: this.IP,
                port: this.port,
                ID: this.ID
            }))
        });

        this.getPeersFromTrackerAndConnect(ws, socketToTracker, torrent)
    }
    
    private getInfoHashOfPeer = async () => {
        const torrentFileInfo: string[] = []

        const files = fs.readdirSync(this.torrentDir)
        
        files.forEach(async file => {
            if(file.endsWith('.torrent')){
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
                console.log(`Recieve file from ${IP}:${port}`)
            })

            socketToPeer.on('end', () => {
                this.socketToPeers.delete(socketToPeer)
            })
        })
    }

}

if(IP) new NOde(defaultPort, IP, peerID)

