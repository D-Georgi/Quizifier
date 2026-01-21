import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function EditQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  
  // Form State
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('mcq'); // 'mcq' or 'free'
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');

  useEffect(() => {
    fetchData();
  }, [quizId]);

  const fetchData = async () => {
    // Get Quiz Title
    const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', quizId).single();
    if (quiz) setQuizTitle(quiz.title);

    // Get Existing Questions
    const { data: qs } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('order');
    setQuestions(qs || []);
  };

  const handleOptionChange = (index, value) => {
    const newOpts = [...options];
    newOpts[index] = value;
    setOptions(newOpts);
  };

  const addQuestion = async () => {
    if (!qText || !correctAnswer) return alert("Please fill in question and correct answer");
    if (qType === 'mcq' && options.some(o => o.trim() === '')) return alert("Please fill all options");

    const newOrder = questions.length + 1;
    
    const { data, error } = await supabase.from('questions').insert({
      quiz_id: quizId,
      question_text: qText,
      question_type: qType,
      options: qType === 'mcq' ? options : null,
      correct_answer: correctAnswer,
      order: newOrder
    }).select();

    if (error) {
      alert(error.message);
    } else {
      setQuestions([...questions, data[0]]);
      // Reset Form
      setQText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
    }
  };

  const deleteQuestion = async (id) => {
    await supabase.from('questions').delete().eq('id', id);
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <button onClick={() => navigate('/dashboard')} className="text-blue-600 mb-4">&larr; Back to Dashboard</button>
      <h1 className="text-3xl font-bold mb-6">Editing: {quizTitle}</h1>

      {/* --- LIST OF EXISTING QUESTIONS --- */}
      <div className="space-y-4 mb-10">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex justify-between items-center">
            <div>
              <span className="font-bold text-gray-500 mr-2">Q{i + 1}.</span>
              <span className="font-semibold">{q.question_text}</span>
              <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded uppercase">{q.question_type}</span>
            </div>
            <button onClick={() => deleteQuestion(q.id)} className="text-red-500 hover:text-red-700 font-bold">Delete</button>
          </div>
        ))}
      </div>

      {/* --- ADD NEW QUESTION FORM --- */}
      <div className="bg-white p-6 rounded shadow-lg border">
        <h2 className="text-xl font-bold mb-4">Add New Question</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Question Text</label>
          <input 
            className="w-full p-2 border rounded" 
            value={qText} 
            onChange={e => setQText(e.target.value)} 
            placeholder="e.g. What is the capital of France?"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Type</label>
          <select 
            className="w-full p-2 border rounded" 
            value={qType} 
            onChange={e => { setQType(e.target.value); setCorrectAnswer(''); }}
          >
            <option value="mcq">Multiple Choice</option>
            <option value="free">Free Response</option>
          </select>
        </div>

        {qType === 'mcq' && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            {options.map((opt, idx) => (
              <div key={idx}>
                <label className="block text-xs font-bold mb-1 text-gray-500">Option {idx + 1}</label>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    name="correct" 
                    className="mr-2"
                    checked={correctAnswer === opt && opt !== ''}
                    onChange={() => setCorrectAnswer(opt)}
                  />
                  <input 
                    className="w-full p-2 border rounded" 
                    value={opt} 
                    onChange={e => handleOptionChange(idx, e.target.value)} 
                    placeholder={`Option ${idx + 1}`}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 col-span-2">* Click the radio button next to the correct option.</p>
          </div>
        )}

        {qType === 'free' && (
          <div className="mb-4">
            <label className="block text-sm font-bold mb-1">Correct Answer (Exact Match)</label>
            <input 
              className="w-full p-2 border rounded bg-green-50" 
              value={correctAnswer} 
              onChange={e => setCorrectAnswer(e.target.value)} 
              placeholder="Enter the exact answer key"
            />
          </div>
        )}

        <button 
          onClick={addQuestion} 
          className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition"
        >
          Save Question
        </button>
      </div>
    </div>
  );
}