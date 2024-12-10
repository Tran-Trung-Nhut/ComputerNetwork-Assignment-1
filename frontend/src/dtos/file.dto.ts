export interface FileDto {
    id: string,// infoHash
    file: FileInfo,
    percent: number,
}
interface FileInfo {
    name: string,
    length: number,
    path: string,
    pieceLength: number
}