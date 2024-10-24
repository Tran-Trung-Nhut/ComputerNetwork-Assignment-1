import { atom } from 'recoil';

export const clientState = atom({
    key: 'clientState', // unique ID (cho Recoil để quản lý)
    default: {
        username: '',
        apiPort: -1,
        port: -1,
        wsPort: -1,
    },
});

export const isLoggedInState = atom({
    key: 'isLoggedInState',
    default: false,
});

export const wsState = atom<WebSocket | null>({
    key: 'ws',
    default: null
})