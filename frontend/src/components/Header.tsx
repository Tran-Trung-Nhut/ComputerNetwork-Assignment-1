import logo from "../assets/logo.png"

export default function Header() {
    return (
        <div className="h-[80px] shadow border-2 text-center flex justify-center items-center flex-shrink-0 z-2">
            <img src={logo} className="w-36 h-24"/>
            <p className="font-mono text-6xl font-bold">MULTITRANS</p>
        </div>
    )
}

