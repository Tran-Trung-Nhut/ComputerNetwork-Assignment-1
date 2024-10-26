import { atom } from 'recoil';

export const clientState = atom({
    key: 'clientState', // unique ID (cho Recoil để quản lý)
    default: {
        port: -1,
        username: '',
        password: ''
    },
});

export const isLoggedInState = atom({
    key: 'isLoggedInState',
    default: false,
});


export const wsState = atom <WebSocket | null>({
    key: 'wsState',
    default: null
})