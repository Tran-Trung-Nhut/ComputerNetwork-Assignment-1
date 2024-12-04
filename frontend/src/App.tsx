import './App.css';
import { Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { wsState } from './state';
import UploadAndDownloadShow from './pages/UploadAndDownloadShow';
import DefaultLayout from './pages/DefaultLayout';
import Home from './pages/Home';
import Peers from './pages/Peers';

function App() {

  const ws = useRecoilValue(wsState)
  const setWs = useSetRecoilState(wsState)

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:2000')
    setWs(websocket)
  }, [setWs])

  return (
    <Router>
      <Routes>
        <Route path='/' element={<DefaultLayout />}>
          <Route path='/home' element={<Home />} />
          <Route path='/history' element={<UploadAndDownloadShow />} />
          <Route path='/peers' element={<Peers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
