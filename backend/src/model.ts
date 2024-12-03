import { Socket } from 'net'

export const SEND_CHUNKDATA_MSG = 'SendChunkData'
export const SEND_PEERINFOS_MSG = 'retrieve peerinfos with info hash'
export const SEND_PIECEINFOS_MSG = 'send pieceinfos with info hash'
export const SEND_PIECEDATAS_MSG = 'send piece data'
export const SEND_DOWNLOAD_SIGNAL_MSG = 'connect for downloading and get peers related to file'
export const RECIEVED_PIECE_MSG = 'recieved piece succesfully'
export const SEND_SUCCESS_MSG = 'send pieced successfully'
export const REQUEST_ALL_PEERINFOS = 'request all peerinfos'
export const SEND_ALL_PEERINFOS_MSG = 'send all peerinfos'
export const trackerPort = 6005
export const server = { IP: '192.168.77.196', port: trackerPort }
export const portSendFile = 6001
export const infoHashMapPeersJSONPath = 'localStorage/infoHashList.json'

export class ChunkDataMessage {
    message: string = SEND_CHUNKDATA_MSG
    index: Number = 0
    buffer: Buffer | null = null
}
export interface PieceDownloadInfo {
    infoHash: string
    file: FileInfo
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
    file: FileInfo
    maxSize: Number
    peers: { info: PeerInfo, numPieces: number, numDownloaded: number, online: boolean }[]
}
export interface Connection {
    peerInfo: PeerInfo
    socket: Socket
}
export interface FileInfo {
    name: string,
    length: number,
    path: string,
    pieceLength: number
}