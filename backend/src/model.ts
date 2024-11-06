import { Socket } from 'net'

export const SEND_CHUNKDATA_MSG = 'SendChunkData'
export const RETRIVE_PEERINFOS_MSG = 'retrieve peerinfos with info hash'
export const SEND_PIECEINFOS_MSG = 'send pieceinfos with info hash'
export const SEND_PIECEDATAS_MSG = 'send piece data'
export class SendChunkInfoMessage {
    message: String = SEND_PEERINFOS_MSG
    chunkInfo: FileChunkInfo | undefined
    peerInfo: PeerInfo | undefined
}
export interface FileChunkInfo {
    pathFile: String
    startChunk: Number
    endChunk: Number
    chunkSize: Number
}
export class ChunkDataMessage {
    message: String = SEND_CHUNKDATA_MSG
    index: Number = 0
    buffer: Buffer | null = null
}
export interface PieceDownloadInfo { //Like magnet link :V
    name: String
    pieceSize: number
    infoHash: String
    indexs: number[]
}
export interface DownloadInfo {
}
export class PeerInfo {
    IP: string = ""
    port: number = -1
    ID: string = ""
    isEqual(other: PeerInfo): Boolean {
        return this.IP == other.IP && this.ID == other.ID
    }
}
