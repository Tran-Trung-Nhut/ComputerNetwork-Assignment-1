import Login from "./Login";
import { useState } from "react";
import axios from "axios";
import { clientState, wsState } from "../state";
import { useRecoilValue } from "recoil";



export default function Home(){
    const [fileName, setFileName] = useState('')
    const [listPeer, setListPeer] = useState<{IP: string, port: number, username: string}[]>([])
    const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: string }>({});
    const client = useRecoilValue(clientState)
    const ws = useRecoilValue(wsState)

    const handleFindPeers = async () => {
        try{
            if(!ws) return
            
            ws.send(JSON.stringify({
                message: 'requestPeer',
                fileName
            }))

            ws.onmessage = (event) => {
                const data = event.data
                const message = JSON.parse(data)

                if(message.message === 'File name has to be filled'){
                    return console.log(message.message)
                }

                setListPeer(message.peerList)
            }

        }catch(e){
            console.log(e)
            setListPeer([])
        }
    }

    const handleConnectButtion = async (IP: string, port: number) => {
        try{
            const response = await axios.post(`http://localhost:8040/api/request-connect`,{
                IP,
                port
            }) 
            
            setConnectionStatus((prevStatus) => ({
                ...prevStatus,
                [IP + ':' + port.toString()]: "waiting",
            }));
            
            // const ws = new WebSocket(`ws://localhost2000:`)
            
            if(!ws) return 

            ws.onmessage = (event) => {
                const messageData = event.data;
                const data = JSON.parse(messageData);

                if (data.message === "accepted") {
                    setConnectionStatus((prevStatus) => ({
                        ...prevStatus,
                        [IP + ':' + port.toString()]: "accepted",
                    }));
                } else {
                    setConnectionStatus((prevStatus) => ({
                        ...prevStatus,
                        [IP + ':' + port.toString()]: "denied",
                    }));
                };
            }
            console.log(response)
        }catch(e){
            console.log(e)
        }
    }


    return(
        <div>
            {listPeer.length !== 0 ? (
                <ul>
                    {listPeer.map((peer, index) => (
                        peer.username !== client.username ? (
                        <div className="flex">
                            <li key={index}>
                                {peer.IP}:{peer.port} 
                            </li>
                            <button key={index} 
                            className={`${connectionStatus[peer.IP + ':' + peer.port.toString()] === 'waiting' 
                                || connectionStatus[peer.IP + ':' + peer.port.toString()] === 'accepted' 
                                || connectionStatus[peer.IP + ':' + peer.port.toString()] === 'denied' ? 'border-0' : 'border-2'} active:scale-90`}
                            
                            onClick={() => handleConnectButtion(peer.IP, peer.port)}
                            
                            disabled={connectionStatus[peer.IP + ':' + peer.port.toString()] === 'waiting' 
                                || connectionStatus[peer.IP + ':' + peer.port.toString()] === 'accepted' 
                                || connectionStatus[peer.IP + ':' + peer.port.toString()] === 'denied'}
                            >
                                {connectionStatus[peer.IP + ':' + peer.port.toString()] === "waiting"
                                        ? "Đang chờ..."
                                        : connectionStatus[peer.IP + ':' + peer.port.toString()] === "accepted"
                                            ? "Kết nối thành công!"
                                            : connectionStatus[peer.IP + ':' + peer.port.toString()] === "denied"
                                                ? "Kết nối bị từ chối"
                                                : "Kết nối"}
                            </button>
                        </div>
                        ) : null
                    ))}
                </ul>
            ) : (
                <></>
            )}
            <input 
            type="text"
            value={fileName}
            className="border-2"
            onChange={(e) => setFileName(e.target.value)}
            />
            <button
            type="button"
            className="border-2 active:scale-90"
            onClick={handleFindPeers}>
                Yêu cầu peer có file
            </button>
            
        </div>
    )
}