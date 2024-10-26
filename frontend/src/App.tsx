import './App.css';
import { Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import PopupRequest from './components/Popup-Request';
import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { clientState, isLoggedInState, wsState } from './state';

function App() {

  const ws = useRecoilValue(wsState)
  const setWs = useSetRecoilState(wsState)
  const setClient = useSetRecoilState(clientState)
  const setIsLoggedIn = useSetRecoilState(isLoggedInState)

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:2000')
    setWs(websocket)

    return() => {
      websocket.close()
    }
  }, [setWs])

  useEffect(() => {
    const savedClient = localStorage.getItem("client");
    if(savedClient){
        setClient(JSON.parse(savedClient));
        setIsLoggedIn(true);
    }
}, [setClient, setIsLoggedIn])

  return (
      <Router>
        <Routes>
          <Route path='/' element={<Login/>}/>
          <Route path='/home' element={<Home/>}/>
        </Routes>
        <PopupRequest/>
      </Router>
  );
}

export default App;
