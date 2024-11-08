import { faFileDownload, faFileText } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useSetRecoilState } from "recoil"
import { isOpenAddFileTorrentState, isOpenCreateTorrentState } from "../state"

export default function Home(){
    const setIsOpenAddFileTorrent = useSetRecoilState(isOpenAddFileTorrentState)
    const setIsOpenCreateTorrent = useSetRecoilState(isOpenCreateTorrentState)

    return(
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
                    onClick={() => {setIsOpenAddFileTorrent(true)}}
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
            </div>
        </div>
    )
}