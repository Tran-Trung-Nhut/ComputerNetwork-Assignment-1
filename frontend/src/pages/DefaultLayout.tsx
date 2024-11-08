import { useEffect } from "react";
import { connectedPeerState, fileSeedingState, isOpenAddFileTorrentState, isOpenCreateTorrentState, isOpenSettingState, wsState } from "../state";
import { useRecoilValue, useSetRecoilState } from "recoil";
import Header from "../components/Header";
import SideBar from "../components/SideBar";
import { Outlet, useLocation } from "react-router-dom";
import CreateTorrentPopup from "../components/CreateTorrentPopup";
import AddFileTorrentPopup from "../components/AddFileTorrentPopup";
import SettingPopup from "../components/SettingPopup";



export default function DefaultLayout(){
    const ws = useRecoilValue(wsState)
    const isOpenCreateTorrent = useRecoilValue(isOpenCreateTorrentState)
    const isOpenAddFileTorrent = useRecoilValue(isOpenAddFileTorrentState)
    const isOpenSetting = useRecoilValue(isOpenSettingState)
    const setFileSeeding = useSetRecoilState(fileSeedingState)
    const location = useLocation();
    const setConnectedPeer = useSetRecoilState(connectedPeerState)

    const handleConnectButtion = async (IP: string, port: number) => {
        try{            
            if(!ws) return 

            ws.onmessage = (event) => {

            }
        }catch(e){
            console.log(e)
        }
    }

    useEffect(() => {
        if(!ws) return

        ws.onmessage = (event) =>{
            const message = JSON.parse(event.data)
            console.log(message)
            if(message.message === 'initialize'){
                setFileSeeding(message.infoHashOfPeer)
                setConnectedPeer(message.connectedPeer)
            }

            if(message.message === 'Update connectedPeer'){
                setConnectedPeer(message.connectedPeer)
            }
        }
    }, [ws])

    return(
    <div className="flex flex-col h-screen">
        {/* Header */}
        <Header />

        {/* Body */}
        <div className="flex flex-grow">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
                <SideBar />
            </div>

            {/* Main content */}
            <div className={`flex-grow flex ${location.pathname === '/home'? 'items-center justify-center p-4' : 'items-start justify-start'} overflow-auto`}>                    
                <Outlet />
            </div>
        </div>
        {isOpenAddFileTorrent && <AddFileTorrentPopup />}
        {isOpenCreateTorrent && <CreateTorrentPopup />}
        {isOpenSetting && <SettingPopup/>}
    </div>
);

}