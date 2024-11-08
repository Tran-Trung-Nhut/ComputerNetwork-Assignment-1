import { useRecoilValue } from "recoil"
import { fileSeedingState } from "../state"

export default function UploadAndDownloadShow(){
    const fileSeedings = useRecoilValue(fileSeedingState)

    return(
        <> 
            <table className="table-auto w-[1000px]">
                <thead className="border-2 border-gray-400 w-full">
                    <tr className="bg-gray-200">
                        <th className="border-b-2 border-gray-400 px-4 py-2">Tên tệp/thư mục</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Số lượt tải lên</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {fileSeedings.map((fileSeeding, index) => (
                        <tr key={index} className="hover:bg-gray-200 h-14">
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{fileSeeding.name}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{fileSeeding.uploadTime}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{fileSeeding.completedFile === 100? 'Tải lên' : fileSeeding.completedFile.toString() + '%'}</td>
                        </tr>
                    ))}
                </tbody>
            </table> 
        </>
    )
}