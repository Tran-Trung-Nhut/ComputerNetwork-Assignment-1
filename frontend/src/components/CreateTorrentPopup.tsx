import Modal from 'react-modal'
import { useRecoilValue, useSetRecoilState } from "recoil"
import { isOpenCreateTorrentState, outputPathState, wsState } from "../state"
import React, { useEffect, useState } from 'react'

export default function CreateTorrentPopup() {
    const isOpenCreateTorrent = useRecoilValue(isOpenCreateTorrentState)
    const [filePath, setFilePath] = useState<string>('')
    const [trackerURL, setTrackerURL] = useState<string>('')
    const [pieceLength, setPieceLength] = useState<number>(0)
    const [fileName, setFileName] = useState<string>()
    const setIsOpenCreateTorrent = useSetRecoilState(isOpenCreateTorrentState)
    const ws = useRecoilValue(wsState)
    const outputPath = useRecoilValue(outputPathState)

    useEffect(() => {
        // Đặt phần tử ứng dụng chính
        setFileName(getDefaultFileName())

        if(!ws) return

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)

            if(message.message === 'Create torrent successfully'){
                alert('Tạo tệp torrent thành công')
            }
        }

    }, [filePath, ws]);

    const getDefaultFileName = () => {
        if(filePath === '') return '';

        const segments = filePath.split(/[/\\]/)

        const fileNameRaw = segments[segments.length - 1].split('.')

        return fileNameRaw[0]
    }

    const handleCreateTorrentFile = async (e: React.FormEvent) => {
        e.preventDefault()
        if(!ws) return

        const fileAndExtension: string = fileName + '.torrent'

        ws.send(JSON.stringify({
            message: 'create torrent',
            filePath: filePath, 
            trackerURL: trackerURL, 
            pieceLength: pieceLength, 
            name: fileAndExtension, 
            outputTorrentPath: outputPath
        }))

        setIsOpenCreateTorrent(false)
    }

    return(
        <> 
            <Modal
                key="createTorrentModal"
                isOpen={isOpenCreateTorrent}
                ariaHideApp={false}
                onRequestClose={() => setIsOpenCreateTorrent(false)} // Đóng modal khi nhấn ngoài
                style={{
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000
                },
                content: {
                    top: '50%',
                    left: '50%',
                    right: 'auto',
                    bottom: 'auto',
                    marginRight: '-50%',
                    transform: 'translate(-50%, -50%)',
                    width: '500px',
                    zIndex: 1000
                },
                }}
            >
                <p className="text-xl font-mono font-bold mb-4 text-center">Tạo tệp .Torrent mới</p>
                <form className="space-y-4 font-mono">
                <div className='flex justify-center items-center space-x-1'>
                    <input 
                        value={filePath}
                        type="text" 
                        placeholder="Dán đường dẫn đến tệp hoặc thư mục" 
                        className="w-full border rounded p-2 focus:outline-none"
                        onChange={(e) => setFilePath(e.target.value)}
                    />
                </div>
                <input 
                    type='text'
                    value={fileName}
                    placeholder="Tên tệp .torent" 
                    className="w-full border rounded p-2 focus:outline-none"
                    onChange={(e) => {
                        setFileName(e.target.value)
                        console.log(fileName)
                    }}
                />
                <input 
                    type='text'
                    value={trackerURL}
                    placeholder="Tracker URL" 
                    className="w-full border rounded p-2 focus:outline-none"
                    onChange={(e) => setTrackerURL(e.target.value)}
                />
                <input 
                    type='number'
                    placeholder='kích thước mảnh'
                    className="w-full border rounded p-2 focus:outline-none"
                    onChange={(e) => setPieceLength(Number(e.target.value))}
                />
                <div className="flex justify-end space-x-2">
                    <button 
                    type="button" 
                    className="bg-gray-400 text-white px-4 py-2 rounded" 
                    onClick={() => setIsOpenCreateTorrent(false)} // Đóng modal khi nhấn hủy
                    >
                    Hủy
                    </button>
                    <button 
                    type="submit" 
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={(e) => handleCreateTorrentFile(e)}
                    >
                    Tạo
                    </button>
                </div>
                </form>
            </Modal>
        </>
    )
}