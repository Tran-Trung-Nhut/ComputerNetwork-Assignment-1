export interface FileDto {
    id: string,
    file: FileInfo,
    percent: number,
}
interface FileInfo {
    name: string,
    length: number,
    path: string,
    pieceLength: number
}