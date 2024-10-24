import { Request, Response } from 'express'
import dotenv from 'dotenv'
import { db } from '../db/db';
import { node, nodeFile } from '../db/schema';
import { eq } from 'drizzle-orm';
import { App, app, certainClient, fileNames, resetCertainClient, resetFileName } from '../app';
import { createServer, Server } from 'net';
import { Socket } from 'net';

dotenv.config()



class Tracker{
    private netServer: Server
    private peers: Socket[] = []

    constructor(port: number){
        this.handleConnection()

        this.netServer = createServer((socket) =>{
            console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);
            this.peers.push(socket)

            const checkInterval = setInterval(() => {
                if (certainClient !== null) {

                    const message = JSON.stringify({
                        fileNames: fileNames,
                        certainClient: certainClient,
                    });
                    //Trả giá trị lại ban đầu để gửi mới cho socket
                    resetFileName()
                    resetCertainClient()

                    socket.write(message);

                    clearInterval(checkInterval);
                }
            }, 1000);

            socket.on('close', () => {
                this.peers = this.peers.filter(peer => peer !== socket);
            });
        })

        this.netServer.listen(port,  () => {
            console.log(`Net server is running on port: ${port}`);
        });

        app.listen(process.env.API_TRACKER_PORT, () => {})
    }

    public handleConnection = async () => {
        app.get('/tracker/peers/:fileName', async (req: Request, res: Response) => {
            const { fileName } = req.params   

            const peers = await db
            .select({
                port: nodeFile.port
            })
            .from(nodeFile)
            .where(eq(nodeFile.name, fileName))

            if(peers.length === 0){
                res.status(404).json({
                    message: "Not found"
                })
                return
            }

            res.status(200).json({
                message: "Success",
                peers: peers
            })
        })
    }
}

export const appMain = new App()

new Tracker(Number(process.env.TRACKER_PORT))
