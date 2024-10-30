import { createServer, Server, Socket } from 'net'
import { Request, Response } from 'express'
import { ClientDto } from "../dtos/client.dto";
import dotenv from 'dotenv'
import { app } from '../app';  
import { WebSocket, WebSocketServer } from 'ws'
import { networkInterfaces } from 'os';

dotenv.config()

let client:ClientDto | null = null

class NOde{
    private peerServer: Server
    private peerPort: number | undefined
    private host : string
    private acceptedPort : {[key: number]: string} = {} //dùng để xác định port nào cần file nào
    private activeWsClients: WebSocket[] = [];

    constructor(
    clientPort: number,
    host: string | undefined){

        this.peerPort = clientPort
        this.host = host || ''

        this.peerServer = createServer((socket) => {
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);

            socket.on('data', (data) => {
                const message = JSON.parse(data.toString());
                console.log(message)
                if (message.message === 'requestConnection') {
                    this.sendConnectionRequests(Number(message.peerPort))
                }

                if(message.message === 'Access denied'){
                    this.broadcastMessageToClients({
                        message: 'denied',
                        port: -1,
                    });
                }

                if(message.message === 'Access accepted'){
                    this.broadcastMessageToClients({
                        message: 'accepted',
                        port: -1,
                    });
                }

            });

            socket.on('end', () => {
                console.log('peer disconnected')
            });
        })
        
        
        //peer Server net
        this.peerServer.listen(this.peerPort, this.host, () => {
            const address = this.peerServer.address()
            if(address && typeof address == 'object'){
                console.log(`Server is running at ${address.address}:${address.port}`);
            }
        })

        this.connectToPeer()

        this.requestConnectToPeer()

        
    }


    private sendConnectionRequests(port: number) {
        this.broadcastMessageToClients({
            message: 'New connection requests',
            port: port
        });
    } 

    private broadcastMessageToClients(message: any) {
        const messageString = JSON.stringify(message);
        this.activeWsClients.forEach(wsClient => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(messageString);
            }
        });
    } 

    public requestConnectToPeer = () => {
        app.post('/api/request-connect', (req: Request, res: Response) =>{
            const { peerPort } = req.body

            const client = new Socket()

            client.connect(peerPort, this.host, () => {
                const message = JSON.stringify({
                    message: 'requestConnection',
                    peerPort: this.peerPort
                })
                console.log(message)

                client.write(message)
                
                client.end()

                res.status(200).json({
                    message: 'Request sent successfully',
                });
            })
        })
    }

    public connectToPeer = () =>{
        app.post('/api/connect', (req: Request, res: Response) => {
            const { peerPort, accept } = req.body
            

            if(accept){
                const client = new Socket()
                client.connect(peerPort, this.host, () => {
                    this.acceptedPort[peerPort] = 'file1'
                    const message = JSON.stringify({
                        message: "Access accepted"
                    })
                    
                    client.write(message)
                    
                    client.end()
                    res.status(200).json({
                        message: "Access accepted"
                    })
                })
            }else{
                const client = new Socket()
                client.connect(peerPort, this.host, () => {
                    const message = JSON.stringify({
                        message: "Access denied"
                    })
                    
                    client.write(message)

                    client.end()

                    res.status(200).json({
                        message: "Access denied"
                    })
                })
            }
        }) 
    }

}

let port : number;
let localIp: string;
const webServer : WebSocketServer = new WebSocketServer({ port: Number(process.env.WEBSOCKET_PORT) | 2000});

webServer.on('connection', (ws: WebSocket) => {
    console.log('Connected with frontend')
    
    ws.on('message',(message) => {
        try{
            
            const data = JSON.parse(message.toString())
            if(data.message === 'sendTrackerIp'){
                port = Number(data.port)
                connectToTracker(data.trackerIP)
            }

            if(data.message === 'login'){
                login(ws, data.username, data.password)
            }

            if(data.message === 'requestPeer'){
                requestPeers(ws, data.fileName)
            }
        }catch(e){
            console.log(e)
        }
    })

})


const waitingClient = new Socket()


function connectToTracker (trackerIP: string){
    waitingClient.connect({
        port: Number(process.env.TRACKER_PORT), 
        host: trackerIP,
    }, () => {
        console.log(`Connected to tracker address: ${trackerIP}:${process.env.TRACKER_PORT}`);
    });
}

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
                    iface.toLowerCase().includes('wlan') ||  // Linux (Wi-Fi)
                    iface.toLowerCase().includes('wifi') ||  // Linux/Windows (Wi-Fi)
                    iface.toLowerCase().includes('wi-fi') || // Windows (Wi-Fi)
                    iface.toLowerCase().includes('en')       // macOS thường là "en0", "en1",...
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

localIp = getWifiIPAddress()

function login (ws: WebSocket, username: string, password: string){
    waitingClient.write(JSON.stringify({
        message: 'login',
        username: username,
        password: password,
        IP: localIp,
        port: port
    }))

    waitingClient.on('data', (data) => {
        const jsonData = data.toString()
        const message = JSON.parse(jsonData)

        if(message.message === 'Invalid username or password' || 
            message.message === 'Invalid username' || 
            message.message === 'Invalid password'){
            ws.send(JSON.stringify({
                message: 'Invalid username or password'
            }))
        }

        if(message.message === 'Login successfully'){
            ws.send(JSON.stringify({
                message: 'Login successfully',
                username: message.username,
                password: message.password
            }))
        }
    })
}

function requestPeers(ws: WebSocket,fileName: string) {
    waitingClient.write(JSON.stringify({
        message: "requestPeer",
        fileName: fileName
    }))

    waitingClient.on('data',(data) => {
        const dataMessage = data.toString()
        const message = JSON.parse(dataMessage)

        if(message.message === 'File name has to be filled'){
            ws.send(JSON.stringify({
                message: 'File name has to be filled'
            }))
        }

        if(message.message === 'list of peer'){
            ws.send(JSON.stringify({
                message: 'list of peer',
                peerList: message.peerList
            }))
        }
    })
}



waitingClient.on('data', (data) => {
    if(localIp){
        new NOde(port, localIp)
    }else{
        console.log('cannot open port!')
    }
}); 