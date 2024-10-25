import { useEffect, useState } from "react"
import axios from "axios"
import { ClientDto } from "../dtos/client.dto"
import { useNavigate } from "react-router-dom"
import { useRecoilValue, useSetRecoilState } from "recoil"
import { clientState, isLoggedInState, trackerApiState } from "../state"

export default function Login(){
    const navigate = useNavigate()
    const [inputTrackerApi, setInputTrackerApi] = useState<string>('')
    const [username, setUsername] = useState('')
    const setIsLoggedIn = useSetRecoilState(isLoggedInState)
    const setClient = useSetRecoilState(clientState)
    const trackerApi = useRecoilValue (trackerApiState)
    const setTrackerApi = useSetRecoilState (trackerApiState)

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) =>{
        e.preventDefault()


        try{
            console.log(trackerApi)
            const response = await axios.post(`${trackerApi}:8040/login`,{
                username,
            })

            const port = Number(response.data.client.port)
            const apiPort = Number(response.data.client.apiPort)
            const wsPort =  Number(response.data.client.wsPort)
            
            setClient({username, port, apiPort, wsPort})      
            
            setIsLoggedIn(true)

            navigate('/home')

        }catch(err){
            console.log(err)
        }
    }

    const handleSetTrackerApi = () => {
        setTrackerApi(inputTrackerApi); // Cập nhật trackerApi với giá trị từ input
    };

    return (
        
        <div>
            
           {trackerApi !== ''? (
                <form onSubmit={handleLogin}>
                <p>Thông tin đăng nhập</p>
                <input 
                type="text" 
                value={username}
                className="border-2"
                onChange={(e) => setUsername(e.target.value)}/>
                <button 
                type="submit"
                className="border-2 border-black active:scale-90">
                    Đăng nhập</button>
                </form>
           ):(
            <>
                <input 
                type="text" 
                value={inputTrackerApi}
                onChange={(e) => setInputTrackerApi(e.target.value)} // Cập nhật inputTrackerApi khi người dùng nhập
                className="border-2"
                placeholder="Nhập IP của Máy chủ"
                />
                <button
                    className="border-2"
                    onClick={handleSetTrackerApi} // Cập nhật giá trị trackerApi khi nhấn nút
                >
                    Gửi
                </button>
            </>
           )}
        </div>
    )
}