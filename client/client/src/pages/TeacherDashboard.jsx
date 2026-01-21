import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard({ session }) {
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('creator_id', session.user.id);
    const { data: studentData } = await supabase.from('profiles').select('*').eq('role', 'student');
    setQuizzes(quizData);
    setStudents(studentData);
  };

  const createQuiz = async () => {
    const title = prompt("Quiz Title:");
    if (!title) return;
    const { data, error } = await supabase.from('quizzes').insert({ title, creator_id: session.user.id }).select();
    if (data) setQuizzes([...quizzes, data[0]]);
  };

  const assignStudent = async (quizId) => {
    const studentUsername = prompt("Enter student username to assign:");
    const student = students.find(s => s.username === studentUsername);
    if (student) {
      await supabase.from('assignments').insert({ quiz_id: quizId, student_id: student.id });
      alert('Assigned!');
    } else {
      alert('Student not found');
    }
  };

  const startQuiz = (quizId) => {
    navigate(`/host/${quizId}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <button onClick={createQuiz} className="bg-green-500 text-white px-4 py-2 rounded">Create New Quiz</button>
      </div>

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
              <button onClick={() => assignStudent(quiz.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded">Assign Student</button>
              {/* Note: You would add a standard UI to add questions here, omitted for brevity */}
              <button onClick={() => startQuiz(quiz.id)} className="bg-purple-600 text-white px-3 py-1 rounded">Launch</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}