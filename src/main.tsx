// src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import NewUserDetails from './pages/NewUserDetails.tsx';
import NutritionChat from './pages/NutritionChat.tsx';
import Login from './pages/userlogin.tsx';
import AuthGuard from './pages/authguard.tsx';
import NutritionistLogin from './pages/NutritionistLogin.tsx';
import NutritionistDashboard from './pages/Nutrtionistdashboard.tsx';
import NutritionistRegister from './pages/NutritionistRegister.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/newuserdetails" element={<NewUserDetails />} />
        <Route 
          path="/nutrition_chat" 
          element={
            <AuthGuard>
              <NutritionChat />
            </AuthGuard>
          } 
        />
        <Route path="/nutritionist-login" element={<NutritionistLogin />} />
        <Route path="/nutritionist-dashboard" element={<NutritionistDashboard />} />
        <Route path="/nutritionist-register" element={<NutritionistRegister />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);