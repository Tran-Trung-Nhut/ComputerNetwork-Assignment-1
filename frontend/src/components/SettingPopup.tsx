import Modal from 'react-modal'
import { useRecoilValue, useSetRecoilState } from "recoil"
import { isOpenSettingState, wsState } from "../state"
import { useEffect, useState } from 'react'


export default function SettingPopup(){
    const isOpenSetting = useRecoilValue(isOpenSettingState)
    const setIsOpenSetting = useSetRecoilState(isOpenSettingState)
    const [downloadOutput, setDownloadOutput] = useState<string>('repository')
    const ws = useRecoilValue(wsState)

    useEffect(() => {
        if(!ws) return

        ws.onmessage = (event) => {
            
        }
    }, [ws])

    const handleChangeSetting = () => {
        if(!ws) return

        ws.send(JSON.stringify({
            message: 'change downloadOutput',
            downloadOutput: downloadOutput
        }))
    }

    return(
        <> 
            <Modal
                key="createTorrentModal"
                isOpen={isOpenSetting}
                ariaHideApp={false}
                onRequestClose={() => setIsOpenSetting(false)} // Đóng modal khi nhấn ngoài
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
                    width: '800px',
                    zIndex: 1000
                },
                }}
            >
                <p className="text-3xl font-mono font-bold mb-4 text-center">Cài đặt</p>
                <form className="space-y-4 font-mono">
                <h3 className='text-sm'><u>Lưu ý:</u> Khi đường dẫn tải tệp không phải là <b>Repository</b> thì người dùng khác không thể tải tệp hoặc thư mục từ phía bạn.</h3>
                <div className='flex justify-center items-center'> 
                    <div className='w-[220px]'>
                        <p>Đường dẫn tải tệp: </p>
                    </div>
                    <input 
                        type='text'
                        value={downloadOutput}
                        placeholder="Tên tệp .torent" 
                        className="w-full border rounded p-2 focus:outline-none"
                        onChange={(e) => {
                            setDownloadOutput(e.target.value)
                        }}
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button 
                    type="button" 
                    className="bg-gray-400 text-white px-4 py-2 rounded" 
                    onClick={() => setIsOpenSetting(false)} // Đóng modal khi nhấn hủy
                    >
                    Hủy
                    </button>
                    <button 
                    type="submit" 
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={() => {}}
                    >
                    Lưu
                    </button>
                </div>
                </form>
            </Modal>
        </>
    )
}