import { createServer, Server, Socket } from 'net'
import { Request, Response } from 'express'
import { ClientDto } from "../dtos/client.dto";
import dotenv from 'dotenv'
import { app } from '../app';  
import { WebSocket, WebSocketServer } from 'ws'

dotenv.config()

let client:ClientDto | null = null

class NOde{
    private peerServer: Server
    private webServer : WebSocketServer
    private peerPort: number | undefined
    private apiPort: number
    private host : string
    private acceptedPort : {[key: number]: string} = {} //dùng để xác định port nào cần file nào
    private activeWsClients: WebSocket[] = [];

    constructor(
    files: string, 
    clientPort: number,
    host: string | undefined,
    apiPort: number,
    wsPort: number){

        this.peerPort = clientPort
        this.host = host || ''
        this.apiPort = apiPort
        this.webServer = new WebSocketServer({ port: wsPort})

        this.webServer.on('connection', (ws: WebSocket) => {
            console.log('Connected with frontend')
            
            this.activeWsClients.push(ws);

            ws.on('close', () => {
                // Xóa WebSocket khỏi danh sách khi ngắt kết nối
                this.activeWsClients = this.activeWsClients.filter(client => client !== ws);
            });
        })

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
        this.peerServer.listen(this.peerPort, host, () => {
            console.log(`Peer in port: ${this.peerPort} is running`)
        })

        this.connectToPeer()

        this.requestConnectToPeer()

        //api của peer
        app.listen(this.apiPort, () => {
            console.log(`client is running at port: ${this.apiPort}`)
        })
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


const waitingClient = new Socket()

waitingClient.connect(Number(process.env.TRACKER_PORT), process.env.HOST || '',() =>{
    console.log(`Connected to tracker at port ${process.env.TRACKER_PORT}`);
})

waitingClient.on('data', (data) => {
    const message = data.toString();

    const jsonData = JSON.parse(message);

    const { fileNames, certainClient } = jsonData

    client = certainClient

    const port:number = Number(client?.port) || 0
    const apiPort: number = Number(client?.apiPort) || 0
    const wsPort: number = Number(client?.wsPort) || 0

    const node = new NOde(fileNames, port, process.env.HOST, apiPort, wsPort)
}); 