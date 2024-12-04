import { faBug, faFileDownload, faFileText } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil"
import { isOpenAddFileTorrentState, isOpenCreateTorrentState, wsState } from "../state"
import { Socket } from "net"
import { useEffect, useState } from "react"

export default function Home() {
    const setIsOpenAddFileTorrent = useSetRecoilState(isOpenAddFileTorrentState)
    const setIsOpenCreateTorrent = useSetRecoilState(isOpenCreateTorrentState)
    const [ws, setWs] = useRecoilState(wsState)
    const [fileName, setFileName] = useState()

    useEffect(() => {
        console.log('hello')
        if (!ws) return
        ws.onmessage = (event) => {
            console.log(event.data)
        }

    }, [])

    const testDownload = () => {
        if (!ws) {
            console.error('WebSocket is not open.');
            return;
        }

        ws.send(JSON.stringify({
            message: 'download by torrent',
            fileName: 'sample.txt.torrent',
        }))
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-5 p-4">
            <div className="flex flex-col items-center justify-center">
                <p className="font-mono text-center text-red-500">
                    <i>Lưu ý:</i> tệp hoặc thư mục muốn chia sẻ
                </p>
                <p className="font-mono text-center text-red-500">
                    phải được đặt trong thư mục "<b>Repository</b>" cùng với tệp .torrent <b>cùng tên</b>
                </p>
            </div>
            <div className="flex items-center justify-center space-x-3">
                <button
                    className="p-3 border-2 hover:bg-gray-100 active:scale-90 rounded"
                    onClick={() => { setIsOpenAddFileTorrent(true) }}
                >
                    <FontAwesomeIcon icon={faFileDownload} style={{ height: '50px', width: '50px' }} />
                    <p className="font-mono text-sm">Tải tệp hoặc thư mục</p>
                </button>
                <button
                    className="p-3 border-2 hover:bg-gray-100 active:scale-90 rounded"
                    onClick={() => setIsOpenCreateTorrent(true)}
                >
                    <FontAwesomeIcon icon={faFileText} style={{ height: '50px', width: '50px' }} />
                    <p className="font-mono text-sm">Tạo tệp .torrent</p>
                </button>
                <button
                    className="p-3 border-2 hover:bg-gray-100 active:scale-90 rounded"
                >
                    <FontAwesomeIcon icon={faBug} style={{ height: '50px', width: '50px' }} onClick={() => testDownload()} />
                    <p className="font-mono text-sm">Dev Test</p>
                </button>
            </div>
        </div>
    )
}