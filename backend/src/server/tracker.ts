import { Request, Response } from 'express'
import dotenv from 'dotenv'
import { db } from '../db/db';
import { node, nodeFile } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createServer, Server } from 'net';
import { Socket } from 'net';
import { networkInterfaces } from 'os'

dotenv.config()



class Tracker{
    private netServer: Server
    private onlinePeers: {[id: string]: {IP: string, port: number, username: string}} = {}

    constructor(port: number){
        this.netServer = createServer((socket) =>{
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);

            socket.on('data', (data) => {
                const message = JSON.parse(data.toString())
                console.log(message)
                if(message.message === 'login'){
                    this.verifyLogin(socket, message.username, message.password, message.IP, message.port)
                }

                if(message.message === 'requestPeer'){
                    this.requestPeers(socket, message.fileName)
                }
            })

            socket.on('close', () => {
                const peerIp = socket.remoteAddress;
                const peerPort = socket.remotePort;

                const peerIdToRemove = Object.keys(this.onlinePeers).find(
                    peerId => this.onlinePeers[peerId].IP === peerIp && this.onlinePeers[peerId].port === peerPort
                );

                if(peerIdToRemove) delete this.onlinePeers[peerIdToRemove]
            });
        })

        const localIp = this.getLocalIp()
        if(localIp){
            this.netServer.listen(port, localIp, () =>{
                console.log(`Tracker: ${localIp}:${port}`)
            })
        }else{
            console.log('cannot open port!')
        }
    }

    private verifyLogin = async (socket: Socket, username: string, password: string, IP: string, port: number) => {
        if(!username || username === '' || !password || password === ''){
            return socket.write(JSON.stringify({
                message: "Invalid username or password"
            }))
        }

        const user = await db
        .select()
        .from(node)
        .where(eq(node.username, username))

        if(user.length === 0){
            return socket.write(JSON.stringify({
                message: "Invalid username"
            }))
        }

        if(user[0].password !== password){
            return socket.write(JSON.stringify({
                message: "Invalid password"
            }))
        }

        this.onlinePeers[user[0].id] = {
            IP: IP || '',
            port: port || -1,
            username
        }

        console.log(this.onlinePeers[user[0].id])

        return socket.write(JSON.stringify({
            message: "Login successfully",
            username: user[0].username,
            password: user[0].password
        }))
    }

    public requestPeers = async (socket: Socket, fileName: string) => {
        if(fileName === ''){
            return socket.write(JSON.stringify({
                message: 'File name has to be filled'
            }))
        }

        const listPeer = await db
        .select({
            id: nodeFile.nodeId,
            username: node.username
        })
        .from(nodeFile)
        .innerJoin(node, eq(nodeFile.nodeId, node.id))
        .where(eq(nodeFile.name, fileName))

        let peerList : {IP: string, port: number, username: string}[]  = []

        listPeer.forEach(peer => {
            peerList.push({
                IP: this.onlinePeers[peer.id].IP,
                port: this.onlinePeers[peer.id].port,
                username: peer.username
            })
        });

        return socket.write(JSON.stringify({
            message: 'list of peer',
            peerList: peerList
        }))

    }

    private getLocalIp = () : string | undefined => {
        const nets = networkInterfaces();
        let localIp;

        for(const name of Object.keys(nets)){

            if (name.includes('Wi-Fi') || name.includes('Wireless')) {
                for(const net of nets[name] || []){
                    if(net.family === 'IPv4' && !net.internal){
                        localIp = net.address;
                        break;
                    }
                }
    
                if(localIp) break;
            }
        }

        return localIp
    }
}


new Tracker(Number(process.env.TRACKER_PORT))
