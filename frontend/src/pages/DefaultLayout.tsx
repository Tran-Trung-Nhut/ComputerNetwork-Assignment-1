import { useEffect } from "react";
import { isOpenAddFileTorrentState, isOpenCreateTorrentState, isOpenSettingState, wsState } from "../state";
import { useRecoilValue } from "recoil";
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
    const location = useLocation();

    useEffect(() => {
        if(!ws) return

        ws.onmessage = (event) =>{
            const message = JSON.parse(event.data)
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
            <div className={`flex-grow flex ${location.pathname === '/home' || location.pathname === '/'? 'items-center justify-center p-4' : 'items-start justify-start'} overflow-auto`}>                    
                <Outlet />
                {location.pathname === '/' && (
                    <div className="flex-col font-mono items-center">
                        <p className="text-center text-5xl">
                            <i>Chào mừng đến với </i>
                        </p>
                        <p className="text-center text-6xl font-bold">
                            <i>MultiTrans</i>
                        </p>
                        <p className="text-center text-4xl">
                            <i>Ứng dụng truyền tệp hàng đầu thị trường</i>
                        </p>
                    </div>
                )}
            </div>
        </div>
        {isOpenAddFileTorrent && <AddFileTorrentPopup />}
        {isOpenCreateTorrent && <CreateTorrentPopup />}
        {isOpenSetting && <SettingPopup/>}
    </div>
);

}