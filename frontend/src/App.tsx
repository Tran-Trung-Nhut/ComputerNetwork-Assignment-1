import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import PopupRequest from './components/Popup-Request';
import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { clientState, wsState } from './state';

function App() {
  // const setWs = useSetRecoilState(wsState);
  // const client = useRecoilValue(clientState)


  // useEffect(() => {
  //   if(client.wsPort === -1){
  //     return
  //   }

  //   const ws = new WebSocket(`ws://localhost:${client.wsPort}`)

  //   setWs(ws)

  //   return () => {
  //     ws.close()
  //   }
  // }, [client, setWs])

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
