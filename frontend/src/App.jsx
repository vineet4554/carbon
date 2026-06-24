import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Calculator from './pages/Calculator';
import Coach from './pages/Coach';
import Twin from './pages/Twin';
import Bills from './pages/Bills';
import Rooms from './pages/Rooms';
import Challenges from './pages/Challenges';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public standalone pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Protected application pages with layout sidebar */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/twin" element={<Twin />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function AppWrapper() {
  return <App />;
}
