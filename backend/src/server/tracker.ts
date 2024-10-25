import { Request, Response } from 'express'
import dotenv from 'dotenv'
import { db } from '../db/db';
import { node, nodeFile } from '../db/schema';
import { eq } from 'drizzle-orm';
import { certainClient, resetCertainClient } from '../app';
import { createServer, Server } from 'net';
import { Socket } from 'net';
import { networkInterfaces } from 'os'

dotenv.config()



class Tracker{
    private netServer: Server
    private peers: Socket[] = []

    constructor(port: number){
        this.handleConnection()

        this.netServer = createServer((socket) =>{
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);
            this.peers.push(socket)

            // const checkInterval = setInterval(() => {
            //     if (certainClient !== null) {

            //         const message = JSON.stringify({

            //             certainClient: certainClient,
            //         });
            //         //Trả giá trị lại ban đầu để gửi mới cho socket
            //         resetCertainClient()

            //         socket.write(message);

            //         clearInterval(checkInterval);
            //     }
            // }, 1000);


            socket.on('data', (data) => {
                const message = JSON.parse(data.toString())

                if(message.message === 'login'){
                    this.verifyLogin(socket, message.username, message.password)
                }
            })

            socket.on('close', () => {
                this.peers = this.peers.filter(peer => peer !== socket);
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

    private verifyLogin = async (socket: Socket, username: string, password: string) => {
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

        return socket.write(JSON.stringify({
            message: "Login successfully"
        }))
    }

    public handleConnection = async () => {
        
    }

    private getLocalIp = () : string | undefined => {
        const nets = networkInterfaces();
        let localIp;

        for(const name of Object.keys(nets)){
            for(const net of nets[name] || []){
                if(net.family === 'IPv4' && !net.internal){
                    localIp = net.address;
                    break
                }
            }

            if(localIp) break
        }

        return localIp
    }
}


new Tracker(Number(process.env.TRACKER_PORT))
