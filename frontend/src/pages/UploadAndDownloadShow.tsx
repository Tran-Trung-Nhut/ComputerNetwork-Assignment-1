import { useRecoilValue, useSetRecoilState } from "recoil"
import { fileSeedingState, wsState } from "../state"
import { useEffect, useState } from "react"
import { FileInfo } from "../dtos/file.dto"


const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', // Thứ
    year: 'numeric', // Năm
    month: 'long', // Tháng
    day: 'numeric', // Ngày
    hour: '2-digit', // Giờ
    minute: '2-digit' // Phút
})
export default function UploadAndDownloadShow() {
    const fileSeedings = useRecoilValue(fileSeedingState)
    const setFileSeeding = useSetRecoilState(fileSeedingState)
    const ws = useRecoilValue(wsState)
    const [fileInfo, fileInfoState] = useState<FileInfo[]>()

    useEffect(() => {
        if (!ws) return
        ws.send(JSON.stringify({
            message: 'get fileinfo'
        }))
        const handleWebSocketOpen = () => {
            ws.send(JSON.stringify({
                message: 'refresh Files'
            }))
        }

        const handleWebSocketMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data)

            if (message.message === 'percent') {
                setFileSeeding(message.fileSeeding)
            }

            if (message.message === 'send fileinfo') {
                console.log(event.data)
                fileInfoState(message.files)
            }
        }

        if (ws.readyState === WebSocket.CONNECTING) {
            ws.addEventListener('open', handleWebSocketOpen);
        } else if (ws.readyState === WebSocket.OPEN) {
            handleWebSocketOpen();
        }

        ws.addEventListener('message', handleWebSocketMessage);
        ws.addEventListener('message', handleWebSocketMessage);

        return () => {

            ws.removeEventListener('open', handleWebSocketOpen);
            ws.removeEventListener('message', handleWebSocketMessage);
        };
    }, [ws])

    return (
        <>
            <table className="table-auto w-full font-mono">
                <thead className="border-2 border-gray-400 w-full">
                    <tr className="bg-gray-200">
                        <th className="border-b-2 border-gray-400 px-4 py-2">Số thứ tự</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Tên tệp/thư mục</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Kích thước</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Thời điểm tải</th>
                    </tr>
                </thead>
                <tbody>
                    {fileInfo?.map((file, index) => (
                        <tr key={index} className="hover:bg-gray-200 h-14">
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{index}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{file.name}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{file.length + " KB"}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{file.dateModified ? new Date(file.dateModified.toString()).toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : ''}</td>
                        </tr>
                    ))}

                </tbody>
            </table>
        </>
    )
}