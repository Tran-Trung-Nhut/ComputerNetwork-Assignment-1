import { useEffect, useState } from "react"
import axios from "axios"
import { ClientDto } from "../dtos/client.dto"
import { useNavigate } from "react-router-dom"
import { useSetRecoilState } from "recoil"
import { clientState, isLoggedInState } from "../state"

export default function Login(){
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const setIsLoggedIn = useSetRecoilState(isLoggedInState)
    const setClient = useSetRecoilState(clientState)

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) =>{
        e.preventDefault()

        try{
            const response = await axios.post('http://localhost:8081/login',{
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


    return (
        <div>
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
        </div>
    )
}