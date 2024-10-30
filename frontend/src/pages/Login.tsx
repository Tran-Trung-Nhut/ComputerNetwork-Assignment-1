import { useEffect, useState } from "react"
import axios from "axios"
import { ClientDto } from "../dtos/client.dto"
import { useNavigate } from "react-router-dom"
import { useRecoilValue, useSetRecoilState } from "recoil"
import { clientState, isLoggedInState, wsState } from "../state"

export default function Login(){
    const navigate = useNavigate()
    const [inputTrackerIp, setInputTrackerIp] = useState<string>('')
    const [port, setPort] = useState<string>('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const setIsLoggedIn = useSetRecoilState(isLoggedInState)
    const ws = useRecoilValue(wsState)
    const client = useRecoilValue(clientState)
    const setClient = useSetRecoilState(clientState)

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

        }catch(err){
            console.log(err)
        }
    }

    const handleSendTrackerIpAndPort = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!ws){
            console.log('havent connect with backend')
            return
        }

        console.log(inputTrackerIp)
        ws.send(JSON.stringify({
            message: "sendTrackerIp",
            trackerIP: inputTrackerIp,
            port: Number(port)
        }))
    }

    useEffect(() => {
        if(client.username !== ''){
            setIsLoggedIn(true);
            navigate("/home");
        }
    }, [navigate])

    useEffect(() => {
        if (!ws) return;

        ws.onmessage = (event) => {
            const data = event.data
            const message = JSON.parse(data)
            console.log(message.message)
            if(message.message === 'Invalid username or password'){
                console.log(message.message)
                return
            }
            
            if (message.message === 'Login successfully') {
                console.log(message);

                const newClient = {
                    username: message.username,
                    password: message.password
                }

                setClient(newClient)

                localStorage.setItem("client", JSON.stringify(newClient))
                setIsLoggedIn(true);
                navigate('/home');  // Chuyển hướng sau khi đăng nhập thành công
            }
        }

        return () => {
            ws.onmessage = null; // Dọn dẹp listener khi component unmount
        };
    },[ws, setIsLoggedIn, navigate])

    return (
        
        <div>
            
        
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


                <form onSubmit={handleSendTrackerIpAndPort}>
                <input 
                    type="text" 
                    className="border-2"
                    placeholder="Nhập port listen của bạn"
                    value={port}
                    onChange={(e) => setPort(e.target.value)} />
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
        </div>
    )
}