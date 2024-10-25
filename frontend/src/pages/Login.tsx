import { useEffect, useState } from "react"
import axios from "axios"
import { ClientDto } from "../dtos/client.dto"
import { useNavigate } from "react-router-dom"
import { useRecoilValue, useSetRecoilState } from "recoil"
import { clientState, isLoggedInState, wsState } from "../state"

export default function Login(){
    const navigate = useNavigate()
    const [inputTrackerIp, setInputTrackerIp] = useState<string>('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const setIsLoggedIn = useSetRecoilState(isLoggedInState)
    const setClient = useSetRecoilState(clientState)
    const ws = useRecoilValue(wsState)

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) =>{
        e.preventDefault()

        try{
            if(!ws){
                console.log('havent connect with backend')
                return
            }

            ws.onopen = () =>{
            }

            ws.send(JSON.stringify({
                message: "login",
                username: username,
                password: password
            }))

            ws.onmessage = (event) => {
                const data = event.data
                const message = JSON.parse(data)

                if(message.message === 'Invalid username or password' || 
                    message.message === 'Invalid username' || 
                    message.message === 'Invalid password'){
                    console.log(message.message)
                    return
                }

                setIsLoggedIn(true)
                navigate('/home')
            }

            ws.close()

        }catch(err){
            console.log(err)
        }
    }

    const handleSendTrackerIp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    }


    return (
        
        <div>
            
           {inputTrackerIp !== ''? (
                <form onSubmit={handleLogin}>
                <p>Thông tin đăng nhập</p>
                <input 
                type="text" 
                value={username}
                placeholder="nhập tài khoản"
                className="border-2"
                onChange={(e) => setUsername(e.target.value)}/>
                <input 
                    type="password" 
                    className="border-2"
                    placeholder="nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} />
                <button 
                type="submit"
                className="border-2 border-black active:scale-90">
                    Đăng nhập</button>
                </form>
           ):(
            <>
                 <form onSubmit={handleSendTrackerIp}>
                    <input 
                        type="text" 
                        className="border-2"
                        placeholder="Nhập IP của Máy chủ"
                        value={inputTrackerIp}
                        onChange={(e) => setInputTrackerIp(e.target.value)} />
                    
                    <button
                        type="submit"
                        className="border-2">
                        Gửi
                    </button>
                </form>
            </>
           )}
        </div>
    )
}