

// import dotenv from 'dotenv'
// import { createServer, Server } from 'net';
// import { Socket } from 'net';
// import { networkInterfaces } from 'os'
// import { PeerInfo, SEND_PIECEINFOS_MSG } from '../model';
// import { forEachChild } from 'typescript';

// dotenv.config()

// class Tracker {
//     private netServer: Server
//     private onlinePeers: PeerInfo[] = []
//     private infoHashList: { [infoHash: string]: PeerInfo[] } = {} //Lưu trên DB ?

//     constructor(port: number) {
//         this.netServer = createServer((socket) => {
//             console.log(`Peer connected from ${socket.remoteAddress}:${socket.remotePort}`);

//             socket.on('data', (data) => {

//                 let message: any
//                 try {
//                     message = JSON.parse(data.toString())
//                 } catch (e) {
//                     socket.write(JSON.stringify({
//                         message: 'error',
//                         failure: 'Something went wrong, please do it again'
//                     }))
//                 }

//                 if (message.message === 'upload') {
//                     this.addPeerTo(message.infoHash, message.IP, Number(message.port), message.ID)
//                 }
//                 if (message.message === 'connect for downloading') {
//                     console.log(`Peer IP:${message.IP}-Port:${message.port}-ID:${message.ID} connect for downloading`)
//                 }

//                 if (message.message === 'infoHash') {
//                     this.getPeerWithInfoHash(socket, message.infoHash)
//                 }

//                 if (message.message === 'download') {
//                     this.getPeerWithInfoHash(socket, message.infoHash)
//                 }

//             })

//             socket.on('close', () => {
//             });
//         })

//         const localIp = this.getLocalIp()
//         if (localIp) {
//             this.netServer.listen(port, localIp, () => {
//                 console.log(`Tracker: ${localIp}:${port}`)
//             })
//         } else {
//             console.log('cannot open port!')
//         }
//     }

//     private addPeerTo = async (
//         infoHashOfPeer: [string],
//         IP: string,
//         port: number,
//         ID: string) => {

//         if (!infoHashOfPeer) return

//         infoHashOfPeer.forEach(async (infoHash: string) => {

//             if (!this.onlinePeers[infoHash]) {
//                 this.onlinePeers[infoHash] = [];
//             }

//             await this.onlinePeers[infoHash].push({
//                 IP: IP,
//                 port: port,
//                 ID: ID
//             })

//         });
//     }

//     private getPeerWithInfoHash = (socket: Socket, infoHash: string) => {

//         const peersWithInfoHash = this.infoHashList[infoHash]
//         if (!peersWithInfoHash) {
//             socket.write(JSON.stringify({
//                 message: 'error',
//                 failure: 'No peer has this file'
//             }))

//             return
//         }
//         const onlinePeersWithInfoHash: PeerInfo[] = []
//         peersWithInfoHash.forEach((peer: PeerInfo, index: number) => {
//             this.onlinePeers.forEach((onlinePeer: PeerInfo, index: number) => {
//                 if (onlinePeer.ID === peer.ID) {
//                     onlinePeersWithInfoHash.push(peer)
//                 }
//             })
//         })

//         socket.write(JSON.stringify({
//             message: SEND_PIECEINFOS_MSG,
//             peers: onlinePeersWithInfoHash
//         }))
//     }

//     private getLocalIp = (): string | undefined => {
//         const nets = networkInterfaces();
//         let localIp;

//         for (const name of Object.keys(nets)) {

//             if (name.includes('Wi-Fi') || name.includes('Wireless')) {
//                 for (const net of nets[name] || []) {
//                     if (net.family === 'IPv4' && !net.internal) {
//                         localIp = net.address;
//                         break;
//                     }
//                 }

//                 if (localIp) break;
//             }
//         }

//         return localIp
//     }
// }


// new Tracker(Number(process.env.TRACKER_PORT))