import { atom } from 'recoil';
import { FileDto } from './dtos/file.dto';
import { PeerDto } from './dtos/peer.dto';

export const clientState = atom({
    key: 'clientState', // unique ID (cho Recoil để quản lý)
    default: {
        username: '',
        password: ''
    },
});

export const isOpenCreateTorrentState = atom<boolean>({
    key: 'isOpenCreateTorrentState',
    default: false
})

export const wsState = atom <WebSocket | null>({
    key: 'wsState',
    default: null
})

export const outputPathState = atom<string>({
    key: 'outputPathState',
    default: 'repository'
})

export const isOpenAddFileTorrentState = atom<boolean>({
    key: 'isOpenAddFileTorrentState',
    default: false
})

export const isOpenSettingState = atom<boolean>({
    key: 'isOpenSettingState',
    default: false
})

export const fileSeedingState = atom<FileDto[]>({
    key: 'fileSeedingState',
    default: []
})

export const connectedPeerState = atom<PeerDto[]>({
    key: 'connectedPeerState',
    default: []
})