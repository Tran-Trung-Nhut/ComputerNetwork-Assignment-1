export interface PeerDto {
    info: {
        ID: string
    }
    online: boolean,
    lastConnect: Date
}
export interface PeerInfo {
    IP: string
    port: number
    ID: string
}