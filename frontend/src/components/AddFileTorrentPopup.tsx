import Modal from 'react-modal'
import { useRecoilValue, useSetRecoilState } from "recoil"
import { isOpenAddFileTorrentState, isOpenCreateTorrentState, outputPathState, wsState } from "../state"
import { useState } from 'react'

export default function AddFileTorrentPopup() {
    const isOpenAddFileTorrent = useRecoilValue(isOpenAddFileTorrentState)
    const [filePath, setFilePath] = useState<string>('')
    const setIsOpenAddFileTorrent = useSetRecoilState(isOpenAddFileTorrentState)
    const ws = useRecoilValue(wsState)



    const handleAddTorrentFile = async () => {
        if(!ws) return

        ws.send(JSON.stringify({
            message: 'torrent',
            filePath: filePath
        }))
    }

    return(
        <> 
            <Modal
                key="addFileTorrentModal"
                isOpen={isOpenAddFileTorrent}
                ariaHideApp={false}
                onRequestClose={() => setIsOpenAddFileTorrent(false)} // Đóng modal khi nhấn ngoài
                style={{
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1001
                },
                content: {
                    top: '50%',
                    left: '50%',
                    right: 'auto',
                    bottom: 'auto',
                    marginRight: '-50%',
                    transform: 'translate(-50%, -50%)',
                    width: '500px',
                    zIndex: 1001
                },
                }}
            >
                <p className="text-xl font-mono font-bold mb-4 text-center">Tải tệp hoặc thư mục bằng tệp .torren</p>
                <form className="space-y-4 font-mono">
                    <input 
                        type='text'
                        value={filePath}
                        placeholder="Đường dẫn đến tệp .torrent" 
                        className="w-full border rounded p-2 focus:outline-none"
                        onChange={(e) => setFilePath(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2">
                        <button 
                        type="button" 
                        className="bg-gray-400 text-white px-4 py-2 rounded" 
                        onClick={() => setIsOpenAddFileTorrent(false)} // Đóng modal khi nhấn hủy
                        >
                        Hủy
                        </button>
                        <button 
                        type="submit" 
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={() => handleAddTorrentFile()}
                        >
                        Tải xuống
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    )
}