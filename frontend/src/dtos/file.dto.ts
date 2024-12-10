export interface FileDto {
    id: string,
    file: FileInfo,
    percent: number,
}
export interface FileInfo {
    name: string,
    length: number,
    path: string,
    pieceLength: number
    dateModified?: Date
}