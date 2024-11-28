import { useRecoilValue, useSetRecoilState } from "recoil"
import { connectedPeerState, wsState } from "../state"
import { useEffect } from "react"

export default function Peers(){
    const connectedPeer = useRecoilValue(connectedPeerState)
    const setConnectedPeer = useSetRecoilState(connectedPeerState)
    const ws = useRecoilValue(wsState)

    useEffect(() => {
        if(!ws) return

        const handleWebSocketOpen = () => {
            ws.send(JSON.stringify({
                message: 'refresh Peers'
            }));
        };
    
        const handleWebSocketMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);
            if (message.message === 'refresh Peers') {
                setConnectedPeer(message.connectedPeer);
            }
        };
    
        if (ws.readyState === WebSocket.CONNECTING) {
            ws.addEventListener('open', handleWebSocketOpen);
        } else if (ws.readyState === WebSocket.OPEN) {
            handleWebSocketOpen();
        }
    
        ws.addEventListener('message', handleWebSocketMessage);
    
        return () => {
            ws.removeEventListener('open', handleWebSocketOpen);
            ws.removeEventListener('message', handleWebSocketMessage);
        };
        
    }, [ws])


    const handleStopConnecting = async (ID: string) => {
        if(!ws) return

        const tempConnectedPeer = connectedPeer.map((peer) => {
            if(peer.ID === ID){
                return {...peer, status: 'offline'}
            }

            return peer
        })

        await setConnectedPeer(tempConnectedPeer)

        ws.send(JSON.stringify({
            message: 'Update connectedPeer and stop connecting',
            connectedPeer: connectedPeer,
            ID: ID
        }))
    }

    return(
        <> 
            <table className="table-auto w-full font-mono">
                <thead className="border-2 border-gray-400 w-full">
                    <tr className="bg-gray-200">
                        <th className="border-b-2 border-gray-400 px-4 py-2">ID của peer</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Kết nối lần cuối</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Tình trạng</th>
                        <th className="border-b-2 border-gray-400 px-4 py-2">Tùy chọn</th>
                    </tr>
                </thead>
                <tbody>
                    {connectedPeer.map((peer, index) => (
                        <tr key={index} className="hover:bg-gray-200 h-14">
                            <td className="border-b border-gray-300 px-4 py-2 text-center" style={{ whiteSpace: 'pre-wrap' }}>
                                {peer.ID ? (peer.ID.match(/.{1,24}/g)?.join('\n') || peer.ID) : ''}
                            </td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">
                            {new Date(peer.lastConnect).toLocaleDateString('vi-VN', {
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long',   
                                day: 'numeric'   
                            })} - {new Date(peer.lastConnect).toLocaleTimeString('vi-VN')}
                            </td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center">{peer.status === 'offline'? 'Không trực tuyến' : 'Đang kết nối'}</td>
                            <td className="border-b border-gray-300 px-4 py-2 text-center" >
                                {peer.status === 'online' && (
                                    <button 
                                    className="bg-red-600 hover:scale-105 p-1 border-red-600 rounded text-white active:scale-95"
                                    onClick={() => handleStopConnecting(peer.ID)}>
                                        Dừng kết nối
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table> 
        </>
    )
}