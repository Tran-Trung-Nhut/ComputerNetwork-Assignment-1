import { Socket } from 'net'

export const SEND_CHUNKDATA_MSG = 'SendChunkData'
export const SEND_PEERINFOS_MSG = 'retrieve peerinfos with info hash'
export const SEND_PIECEINFOS_MSG = 'send pieceinfos with info hash'
export const SEND_PIECEDATAS_MSG = 'send piece data'
export const SEND_DOWNLOAD_SIGNAL_MSG = 'connect for downloading and get peers related to file'
export const RECIEVED_PIECE_MSG = 'recieved piece succesfully'
export const SEND_SUCCESS_MSG = 'send pieced successfully'
export const trackerPort = 6005
export const server = { IP: '192.168.77.196', port: trackerPort }
export const portSendFile = 6001
export const infoHashMapPeersJSONPath = 'localStorage/infoHashList.json'
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
    pieceSize: number
    infoHash: string
    file: {
        name: string,
        length: number,
        path: string
    }
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
    file: {
        name: string,
        length: number,
        path: string
    }
    maxSize: Number
    peers: { info: PeerInfo, numPieces: number, numDownloaded: number, online: boolean }[]
}
export interface Connection {
    peerInfo: PeerInfo
    socket: Socket
}
