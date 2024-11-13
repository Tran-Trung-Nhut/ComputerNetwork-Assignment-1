import { MenuItem } from "primereact/menuitem"
import { Sidebar } from "primereact/sidebar";
import { Menu } from "primereact/menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import { faCog, faDownload, faHome, faUserFriends } from "@fortawesome/free-solid-svg-icons";
import "./SideBar.css"
import { useRecoilValue, useSetRecoilState } from "recoil";
import { isOpenSettingState } from "../state";


export default function SideBar(){
    const isOpenSetting = useRecoilValue(isOpenSettingState)
    const setIsOpenSetting = useSetRecoilState(isOpenSettingState)
    const navigate = useNavigate()

    const items: MenuItem[] = [
        {
            template: (
                <button 
                className="flex items-center space-x-2 mt-2 ml-2 hover:bg-gray-200 w-[230px] active:scale-90"
                onClick={() => navigate('/home')}>
                    <FontAwesomeIcon icon={faHome} />
                    <span>Trang chính</span>
                </button>
            ),
        },
        {
            template: (
                <button 
                className="flex items-center space-x-2 mt-2 ml-2 hover:bg-gray-200 w-[230px] active:scale-90"
                onClick={() => navigate('/history')}>
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Tải xuống</span>
                </button>
            ),
        },
        {
            template: (
                <button 
                className="flex items-center space-x-2 mt-2 ml-2 hover:bg-gray-200 w-[230px] active:scale-90"
                onClick={() => navigate('/peers')}>
                    <FontAwesomeIcon icon={faUserFriends} />
                    <span>Peers</span>
                </button>
            ),
        },
        {
            template: (
                <button 
                className="flex items-center space-x-2 mt-2 ml-2 hover:bg-gray-200 w-[230px] active:scale-90"
                onClick={() => {
                    setIsOpenSetting(!isOpenSetting)
                    console.log(isOpenSetting)
                }}
                >
                    <FontAwesomeIcon icon={faCog} style={{color: 'gray'}}/>
                    <span>Cài đặt</span>
                </button>
            ),
        }
    ]

    return(
        <Sidebar 
        visible={true} 
        maskClassName="custom-sidebar bg-white shadow mt-[80px] font-mono"
        showCloseIcon={false}
        onHide={() => {}} 
        style={{ width: '250px', border: "2px solid #ccc"}}>
            <p className="text-center font-bold text-xl">Công cụ quản lí</p>
            <Menu 
            model={items}  
            className="bg-white"/>
        </Sidebar>
    )
}