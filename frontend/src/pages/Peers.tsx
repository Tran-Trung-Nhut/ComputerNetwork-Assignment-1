import { useRecoilValue } from "recoil"
import { connectedPeerState } from "../state"

export default function Peers(){
    const connectedPeer = useRecoilValue(connectedPeerState)

    return(
        <> 
            <table className="table-auto w-[1000px]">
                <thead className="border-2 border-gray-400 w-full">
                    <tr className="bg-gray-200">
                        <th className="border-b-2 border-gray-400 px-4 py-2">ID của peer</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Tình trạng</th>

                    </tr>
                </thead>
                <tbody>
                    {connectedPeer.map((peer, index) => (
                        <tr key={index} className="hover:bg-gray-200 h-14">
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{peer.ID}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{peer.status === 'off'? 'Không trực tuyến' : 'Đang kết nối'}</td>
                        </tr>
                    ))}
                </tbody>
            </table> 
        </>
    )
}