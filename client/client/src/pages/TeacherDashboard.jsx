import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard({ session }) {
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [assigningQuiz, setAssigningQuiz] = useState(null); // Tracks which quiz is being assigned
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('creator_id', session.user.id);
    const { data: studentData } = await supabase.from('profiles').select('*').eq('role', 'student');
    setQuizzes(quizData || []);
    setStudents(studentData || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const createQuiz = async () => {
    const title = prompt("Quiz Title:");
    if (!title) return;
    const { data, error } = await supabase.from('quizzes').insert({ title, creator_id: session.user.id }).select();
    if (data) setQuizzes([...quizzes, data[0]]);
  };

  const startQuiz = (quizId) => {
    navigate(`/host/${quizId}`);
  };

  // Assign Logic
  const handleAssign = async (studentId) => {
    const { error } = await supabase.from('assignments').insert({ 
      quiz_id: assigningQuiz.id, 
      student_id: studentId 
    });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation code
         alert("This student is already assigned to this quiz.");
      } else {
         alert("Error assigning: " + error.message);
      }
    } else {
      alert("Student assigned successfully!");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-gray-500">Welcome, {session.user.user_metadata.username || 'Teacher'}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={createQuiz} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            + New Quiz
          </button>
          <button onClick={handleLogout} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Sign Out
          </button>
        </div>
      </div>

      {/* QUIZ LIST */}
      <div className="grid gap-4">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-white p-6 rounded shadow flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{quiz.title}</h2>
              <span className={`text-sm px-2 py-1 rounded ${quiz.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                {quiz.status}
              </span>
            </div>
            <div className="space-x-2">
              <button 
                onClick={() => navigate(`/edit/${quiz.id}`)} 
                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
              >
                Edit Questions
              </button>
              
              <button 
                onClick={() => setAssigningQuiz(quiz)} 
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
              >
                Assign Student
              </button>
              
              <button 
                onClick={() => startQuiz(quiz.id)} 
                className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 shadow"
              >
                Launch
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ASSIGNMENT MODAL */}
      {assigningQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold">Assign to: {assigningQuiz.title}</h2>
              <button onClick={() => setAssigningQuiz(null)} className="text-gray-500 hover:text-gray-800 font-bold text-xl">
                &times;
              </button>
            </div>
            
            {students.length === 0 ? (
              <p className="text-gray-500 text-center">No students registered yet.</p>
            ) : (
              <ul className="space-y-2">
                {students.map(student => (
                  <li key={student.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border">
                    <span className="font-semibold">{student.username}</span>
                    <button 
                      onClick={() => handleAssign(student.id)}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </li>
                ))}
              </ul>
            )}
            
            <div className="mt-6 text-right">
              <button onClick={() => setAssigningQuiz(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}