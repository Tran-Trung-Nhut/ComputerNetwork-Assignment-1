import { faBug, faFileDownload, faFileText } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil"
import { isOpenAddFileTorrentState, isOpenCreateTorrentState, wsState } from "../state"
import { Socket } from "net"
import { useEffect, useState } from "react"
import { FileInfo } from "../dtos/file.dto"
import { PeerInfo } from "../dtos/peer.dto"
interface DownloadInfo {
    id: string,
    file: FileInfo,
    peers: { info: PeerInfo, numPieces: number, numDownloaded: number, online: boolean }[],
    percent: number
}
export default function Home() {
    const setIsOpenAddFileTorrent = useSetRecoilState(isOpenAddFileTorrentState)
    const setIsOpenCreateTorrent = useSetRecoilState(isOpenCreateTorrentState)
    const [ws, setWs] = useRecoilState(wsState)
    const [progress, setProgress] = useState<number>(0);
    const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>()
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false) // Trạng thái mở pop-up


    useEffect(() => {
        console.log('hello')
        if (!ws) return
        const getData = (event: any) => {
            const message = JSON.parse(event.data)
            if (message.message === "start downloading") {
                setIsPopupOpen(true)
            }

            if (message.message === 'percent') {
                console.log(message.data)
                setProgress(message.data.percent)
                setDownloadInfo(message.data)
            }

            if (message.message === 'download successfully') {
                setIsPopupOpen(false)
                alert(`tệp ${downloadInfo?.file.name} tải thành công`)
                setProgress(0)
            }
        }
        ws.addEventListener('message', getData);
    }, [ws])

    const testDownload = () => {
        if (!ws) {
            console.error('WebSocket is not open.');
            return;
        }

        ws.send(JSON.stringify({
            message: 'download by torrent',
            fileName: 'dog.mp4_1.torrent',
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
            {isPopupOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-5 rounded shadow-md w-96">
                        <h2 className="text-lg font-bold mb-4 text-center">
                            Đang tải xuống tệp {downloadInfo?.file.name}
                        </h2>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                            <div
                                className="bg-blue-500 h-6 rounded-full"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-center mt-2">{progress}%</p>
                        <ul role="list" className="max-w-sm divide-y divide-gray-200 dark:divide-gray-700">
                            {downloadInfo && (downloadInfo.peers as Array<any>).map((item, index) => (
                                <li className="py-3 sm:py-4">
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                        <div className="flex-shrink-0">
                                            <img className="w-8 h-8 rounded-full" src="/profile.png" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {item.info.IP}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                {item.numDownloaded + " pieces"}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center  ${item.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                                            <span className={`w-2 h-2 me-1 ${item.online ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></span>
                                            {item.online ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>




                </div>
            )}
        </div>
    )
}