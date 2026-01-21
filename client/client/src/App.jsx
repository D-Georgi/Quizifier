import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import HostGame from './pages/HostGame';
import PlayGame from './pages/PlayGame';
import ReviewGame from './pages/ReviewGame';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={session ? <RoleRouter session={session} /> : <Navigate to="/" />} />
          <Route path="/host/:quizId" element={session ? <HostGame /> : <Navigate to="/" />} />
          <Route path="/play/:quizId" element={session ? <PlayGame session={session} /> : <Navigate to="/" />} />
          <Route path="/review/:quizId" element={session ? <ReviewGame session={session} /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function RoleRouter({ session }) {
  // Simple role check based on metadata
  const role = session.user.user_metadata.role;
  return role === 'teacher' ? <TeacherDashboard session={session} /> : <StudentDashboard session={session} />;
}