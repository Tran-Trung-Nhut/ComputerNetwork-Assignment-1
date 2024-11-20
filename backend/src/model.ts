import { Socket } from 'net'
import logger from '../log/winston'

export const SEND_CHUNKDATA_MSG = 'SendChunkData'
export const SEND_PEERINFOS_MSG = 'retrieve peerinfos with info hash'
export const SEND_PIECEINFOS_MSG = 'send pieceinfos with info hash'
export const SEND_PIECEDATAS_MSG = 'send piece data'
export const SEND_DOWNLOAD_SIGNAL_MSG = 'connect for downloading and get peers related to file'
export const RECIEVED_PIECE_MSG = 'recieved piece succesfully'
export const SEND_SUCCESS_MSG = 'send pieced successfully'
export const server = { IP: '192.168.102.110', port: 6005 }
export const portSendFile = 6001
export class SendChunkInfoMessage {
    message: String = SEND_PIECEINFOS_MSG
    chunkInfo: FileChunkInfo | undefined
    peerInfo: PeerInfo | undefined
}
export interface FileChunkInfo {
    pathFile: string
    startChunk: Number
    endChunk: Number
    chunkSize: Number
}
export class ChunkDataMessage {
    message: string = SEND_CHUNKDATA_MSG
    index: Number = 0
    buffer: Buffer | null = null
}
export interface PieceDownloadInfo {
    name: string
    pieceSize: number
    infoHash: string
    indices: number[]
}
export interface DownloadInfo {
}
export interface PeerInfo {
    IP: string
    port: number
    ID: string
}
export interface DownloadState {
    indexes: Number[] // Lưu index của file đã tải đc
    indexMapBuffer: Map<Number, Buffer>  // Map index với buffer
    fileName: string
    numOfPieces: Number
    maxSize: Number
}
export interface Connection {
    peerInfo: PeerInfo
    socket: Socket
}
export function getConnections(peer: PeerInfo, connections: Connection[]): Socket {
    for (let index = 0; index < connections.length; index++) {
        if (checkEqual2Peers(connections[index].peerInfo, peer)) {
            return connections[index].socket
        }
    }
    const socket = new Socket()
    try {
        connections.push({ peerInfo: peer, socket: socket })
        socket.connect(peer.port, peer.IP, () => {
            logger.info(`Connect sucessfully with IP:${peer.IP} - Port:${peer.port}`)
        })
    } catch (error) {
        logger.error(`Something went wrong when connect with IP:${peer.IP} - Port:${peer.port}`)
    }

    return socket
}

export function checkEqual2Peers(peer1: PeerInfo, peer2: PeerInfo) {
    return peer1.ID == peer2.ID && peer1.port == peer2.port
}