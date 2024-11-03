import { useState } from "react";
import { isOpenAddFileTorrentState, isOpenCreateTorrentState, wsState } from "../state";
import { useRecoilValue, useSetRecoilState } from "recoil";
import Header from "../components/Header";
import SideBar from "../components/SideBar";
import { Outlet } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileDownload, faFileText } from "@fortawesome/free-solid-svg-icons";
import CreateTorrentPopup from "../components/CreateTorrentPopup";
import AddFileTorrentPopup from "../components/AddFileTorrentPopup";



export default function Home(){
    const [fileName, setFileName] = useState('')
    const [listPeer, setListPeer] = useState<{IP: string, port: number, username: string}[]>([])
    const ws = useRecoilValue(wsState)
    const isOpenCreateTorrent = useRecoilValue(isOpenCreateTorrentState)
    const setIsOpenCreateTorrent = useSetRecoilState(isOpenCreateTorrentState)
    const isOpenAddFileTorrent = useRecoilValue(isOpenAddFileTorrentState)
    const setIsOpenAddFileTorrent = useSetRecoilState(isOpenAddFileTorrentState)


    const handleConnectButtion = async (IP: string, port: number) => {
        try{            
            if(!ws) return 

            ws.onmessage = (event) => {

            }
        }catch(e){
            console.log(e)
        }
    }

    return(
        <div className="flex flex-col h-screen z-2">
            {/* Header */}
            <Header/>
           
            {/* Body */}
            <div className="flex flex-grow">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0 z-2">
                    <SideBar />
                </div>

                {/* Main content */}
                <div className="flex-grow flex items-center justify-center">
                    <div className="flex items-center space-x-1">
                        <button 
                        className="p-3 border-2 hover:bg-gray-100 active:scale-90 rounded"
                        onClick={() => {setIsOpenAddFileTorrent(true)}}>
                                <FontAwesomeIcon icon={faFileDownload} style={{ height: '50px', width: '50px' }} />
                                <p className="font-mono text-sm">Tải tệp hoặc thư mục</p>
                        </button>
                        <button 
                        className="p-3 border-2 hover:bg-gray-100 active:scale-90 rounded"
                        onClick={() => setIsOpenCreateTorrent(true)}>
                            <FontAwesomeIcon icon={faFileText} style={{ height: '50px', width: '50px' }} />
                            <p className="font-mono text-sm">Tạo tệp .torrent</p>
                        </button>
                        <Outlet />
                    </div>
                </div>
            </div>
            {isOpenAddFileTorrent && <AddFileTorrentPopup/>}
            {isOpenCreateTorrent && <CreateTorrentPopup/>}
        </div>
    )
}