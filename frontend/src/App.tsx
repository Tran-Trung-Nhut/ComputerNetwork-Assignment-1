import './App.css';
import { Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { clientState, wsState } from './state';

function App() {

  const ws = useRecoilValue(wsState)
  const setWs = useSetRecoilState(wsState)
  const setClient = useSetRecoilState(clientState)

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:2000')
    setWs(websocket)

    return() => {
      websocket.close()
    }
  }, [setWs])

  return (
      <Router>
        <Routes>
          <Route path='/' element={<Home/>}/>
        </Routes>
      </Router>
  );
}

export default App;
