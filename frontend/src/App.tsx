import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import PopupRequest from './components/Popup-Request';
import { useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';

function App() {

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
