import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard({ session }) {
  const [assignments, setAssignments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      // Join assignments with quiz details
      const { data } = await supabase
        .from('assignments')
        .select(`
          quiz_id,
          quizzes ( id, title, status )
        `)
        .eq('student_id', session.user.id);
      setAssignments(data);
    };
    fetch();
  }, [session]);

  const handleEnter = (quiz) => {
    if (quiz.status === 'active') navigate(`/play/${quiz.id}`);
    else if (quiz.status === 'completed') navigate(`/review/${quiz.id}`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Quizzes</h1>
      <div className="grid gap-4">
        {assignments.map(({ quizzes: quiz }) => (
          <div key={quiz.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
                <h3 className="font-bold">{quiz.title}</h3>
                <span className="text-xs text-gray-500 capitalize">{quiz.status}</span>
            </div>
            <button 
                disabled={quiz.status === 'locked'}
                onClick={() => handleEnter(quiz)}
                className={`px-4 py-2 rounded text-white ${quiz.status === 'active' ? 'bg-green-500 animate-pulse' : quiz.status === 'completed' ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
                {quiz.status === 'active' ? 'Join Live' : quiz.status === 'completed' ? 'Review' : 'Locked'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}