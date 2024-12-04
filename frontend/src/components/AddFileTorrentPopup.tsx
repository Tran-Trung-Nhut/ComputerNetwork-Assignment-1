import Modal from 'react-modal'
import { useRecoilValue, useSetRecoilState } from "recoil"
import { isOpenAddFileTorrentState, wsState } from "../state"
import React, { useEffect, useState } from 'react'

export default function AddFileTorrentPopup() {
    const isOpenAddFileTorrent = useRecoilValue(isOpenAddFileTorrentState)
    const [filePath, setFilePath] = useState<string>('')
    const setIsOpenAddFileTorrent = useSetRecoilState(isOpenAddFileTorrentState)
    const ws = useRecoilValue(wsState)

    useEffect(() => {
        if (!ws) return

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)

            if (message.message === 'error') {
                if (message.failure === 'No peer has this file') {
                    alert('Không có peer nào sở hữu tệp này');
                    setIsOpenAddFileTorrent(false);
                }

                if (message.failure === 'Something went wrong, please do it again') {
                    alert('Đã có lỗi xảy ra vui lòng thực hiện lại hành động');
                    setIsOpenAddFileTorrent(false);
                }
            }
        }
    }, [ws])

    const handleAddTorrentFile = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!ws) return

        ws.send(JSON.stringify({
            message: 'download by torrent',
            fileName: filePath
        }))

        setIsOpenAddFileTorrent(false)
    }

    return (
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
                            onClick={(e) => handleAddTorrentFile(e)}
                        >
                            Tải xuống
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    )
}