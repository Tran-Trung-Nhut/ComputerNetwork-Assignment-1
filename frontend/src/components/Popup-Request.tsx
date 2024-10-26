import { useEffect, useState } from "react"
import { useRecoilValue } from "recoil"
import { clientState } from "../state"
import { ClientDto } from "../dtos/client.dto"
import axios from "axios"

export default function PopupRequest() {
    const [requestLists, setRequestLists] = useState<number[]>([])
    let client = useRecoilValue(clientState)
    

    useEffect(() => {
        console.log(client)

        const ws = new WebSocket(`ws://localhost:3000`)

        ws.onmessage = (event) => {
            let messageData : string;
            if (event.data instanceof ArrayBuffer) {
                // Chuyển ArrayBuffer sang string
                const decoder = new TextDecoder("utf-8");
                messageData = decoder.decode(event.data);
            } else {
                // Nếu là string, dùng trực tiếp
                messageData = event.data as string;
            }
    
            const data = JSON.parse(messageData);
            console.log(messageData)
    
            if(data.port && data.message === 'New connection requests') {
                
                setRequestLists((prevRequestLists) => [
                    ...prevRequestLists,  
                    data.port
                ]);        
            }

        }
    }, [client])
    
    const handleDeleteFirst = () => {
        const tmpList = [...requestLists]
        console.log(tmpList)
        const removeFirst = tmpList.shift()
        console.log(tmpList)

        if(removeFirst !== undefined){
            setRequestLists(tmpList)
        }
    }

    const handleAccept = async (accept: boolean) => {
        try{
            const response = await axios.post(`http://localhost:/api/connect`,{
                peerPort: requestLists[0],
                accept: accept
            })

            handleDeleteFirst()

            console.log(response.data)
        }catch(e){
            console.log(e)
        }
    }

    return(
        <>
            {requestLists.length > 0 ? (
                <div>
                    <p>Port:{requestLists[0]} muốn kết nối!</p>
                    <button 
                    className="border-2 active:scale-90"
                    onClick={() => handleAccept(true)}>
                        Đồng ý
                    </button>
                    <button 
                    className="border-2 active:scale-90"
                    onClick={() => handleAccept(false)}>
                        Từ chối
                    </button>
                </div>
            ) : (
                <>
                </>
            )}
        </>
    )
}