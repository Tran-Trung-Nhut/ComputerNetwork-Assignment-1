import Login from "./Login";
import { useState } from "react";
import axios from "axios";
import { clientState } from "../state";
import { useRecoilValue } from "recoil";



export default function Home(){
    const [fileName, setFileName] = useState('')
    const [listPort, setListPort] = useState([])
    const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: string }>({});
    const client = useRecoilValue(clientState)

    const handleFindPeers = async () => {
        try{
            
            

        }catch(e){
            console.log(e)
            setListPort([])
        }
    }

    const handleConnectButtion = async (peerPort: number) => {
        try{
            const response = await axios.post(`http://localhost:}/api/request-connect`,{
                peerPort: peerPort
            }) 
            
            setConnectionStatus((prevStatus) => ({
                ...prevStatus,
                [peerPort]: "waiting",
            }));
            
            const ws = new WebSocket(`ws://localhost:`)
            
            // if(!ws) return 

            ws.onmessage = (event) => {
                const messageData = event.data;
                const data = JSON.parse(messageData);

                if (data.message === "accepted") {
                    setConnectionStatus((prevStatus) => ({
                        ...prevStatus,
                        [peerPort]: "accepted",
                    }));
                } else {
                    setConnectionStatus((prevStatus) => ({
                        ...prevStatus,
                        [peerPort]: "denied",
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
            {listPort.length !== 0 ? (
                <ul>
                    {listPort.map((port, index) => (
                        Number(port) !== 1 ? (
                        <div className="flex">
                            <li key={index}>
                                Port: {port} {/* Ví dụ sử dụng thẻ */}
                            </li>
                            <button key={index} 
                            className={`${connectionStatus[port] === 'waiting' 
                                || connectionStatus[port] === 'accepted' 
                                || connectionStatus[port] === 'denied' ? 'border-0' : 'border-2'} active:scale-90`}
                            
                            onClick={() => handleConnectButtion(port)}
                            
                            disabled={connectionStatus[port] === 'waiting' 
                                || connectionStatus[port] === 'accepted' 
                                || connectionStatus[port] === 'denied'}
                            >
                                {connectionStatus[port] === "waiting"
                                        ? "Đang chờ..."
                                        : connectionStatus[port] === "accepted"
                                            ? "Kết nối thành công!"
                                            : connectionStatus[port] === "denied"
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