import { useState } from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username, role } }
      });
      if (error) alert(error.message);
      else alert('Check your email to verify!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-blue-600">
      <form onSubmit={handleAuth} className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">{isSignUp ? 'Sign Up' : 'Login'}</h1>
        
        {isSignUp && (
          <>
            <input className="w-full p-2 mb-2 border rounded" placeholder="Username" onChange={e => setUsername(e.target.value)} required />
            <select className="w-full p-2 mb-2 border rounded" value={role} onChange={e => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </>
        )}

        <input className="w-full p-2 mb-2 border rounded" type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} required />
        <input className="w-full p-2 mb-4 border rounded" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
        
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
        <p className="mt-4 text-center cursor-pointer text-blue-500" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
        </p>
      </form>
    </div>
  );
}