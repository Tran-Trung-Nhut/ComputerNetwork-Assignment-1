import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import PopupRequest from './components/Popup-Request';
import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { wsState } from './state';

function App() {

  const ws = useRecoilValue(wsState)
  const setWs = useSetRecoilState(wsState)

  useEffect(() => {
    setWs(new WebSocket(`ws://localhost:1000`))
  })

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
