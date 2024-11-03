import { atom } from 'recoil';

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