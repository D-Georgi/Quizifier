import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function EditQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null); // Reference for hidden file input

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

  // --- EXPORT FUNCTIONALITY ---
  const handleExport = () => {
    // Transform DB format back to your JSON format
    const exportData = questions.map(q => ({
      type: q.question_type === 'mcq' ? 'MC' : 'FITB',
      q: q.question_text,
      options: q.question_type === 'mcq' ? q.options : undefined,
      correct: q.correct_answer
    }));

    // Create a blob and download it
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quizTitle.replace(/\s+/g, '_')}_questions.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- IMPORT FUNCTIONALITY ---
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        
        // Validate if it's an array or a wrapper object
        // Your example was { fileName: ..., fullContent: [...] }, but usually exports are just [...]
        // We will support both: raw array OR the 'fullContent' key if present.
        let itemsToImport = Array.isArray(jsonData) ? jsonData : (jsonData.fullContent || []);
        
        if (itemsToImport.length === 0) {
          alert("No questions found in JSON.");
          return;
        }

        // Determine the starting order number
        let currentOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order)) + 1 : 1;

        // Transform JSON format -> DB format
        const newQuestions = itemsToImport.map(item => ({
          quiz_id: quizId,
          question_text: item.q,
          question_type: item.type === 'MC' ? 'mcq' : 'free', // Map "MC/FITB" -> "mcq/free"
          options: item.type === 'MC' ? item.options : null,
          correct_answer: item.correct,
          order: currentOrder++
        }));

        // Bulk Insert into Supabase
        const { error } = await supabase.from('questions').insert(newQuestions);

        if (error) {
          console.error(error);
          alert('Error importing questions: ' + error.message);
        } else {
          alert(`Successfully imported ${newQuestions.length} questions!`);
          fetchData(); // Refresh UI
        }
      } catch (err) {
        console.error(err);
        alert("Invalid JSON file.");
      }
      
      // Reset input so you can select the same file again if needed
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  // --- EXISTING CRUD LOGIC ---

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
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 font-semibold hover:underline">
          &larr; Back to Dashboard
        </button>

        {/* --- IMPORT/EXPORT TOOLBAR --- */}
        <div className="space-x-3">
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileUpload} 
             accept=".json" 
             style={{ display: 'none' }} 
           />
           <button 
             onClick={handleImportClick}
             className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 font-medium shadow-sm"
           >
             Import JSON
           </button>
           <button 
             onClick={handleExport}
             className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 font-medium shadow-sm"
           >
             Export JSON
           </button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Editing: {quizTitle}</h1>

      {/* --- ADD NEW QUESTION FORM --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-10">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Add New Question</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1 text-gray-600">Question Text</label>
          <input 
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={qText} 
            onChange={e => setQText(e.target.value)} 
            placeholder="e.g. What is the capital of France?"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-1 text-gray-600">Type</label>
          <select 
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={qType} 
            onChange={e => { setQType(e.target.value); setCorrectAnswer(''); }}
          >
            <option value="mcq">Multiple Choice</option>
            <option value="free">Free Response</option>
          </select>
        </div>

        {qType === 'mcq' && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, idx) => (
              <div key={idx} className="relative">
                <label className="block text-xs font-bold mb-1 text-gray-500">Option {idx + 1}</label>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    name="correct" 
                    className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500"
                    checked={correctAnswer === opt && opt !== ''}
                    onChange={() => setCorrectAnswer(opt)}
                  />
                  <input 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" 
                    value={opt} 
                    onChange={e => handleOptionChange(idx, e.target.value)} 
                    placeholder={`Option ${idx + 1}`}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 col-span-2 mt-1">* Select the radio button for the correct answer.</p>
          </div>
        )}

        {qType === 'free' && (
          <div className="mb-6">
            <label className="block text-sm font-bold mb-1 text-gray-600">Correct Answer Key</label>
            <input 
              className="w-full p-3 border border-green-200 bg-green-50 rounded text-green-800 placeholder-green-700/50" 
              value={correctAnswer} 
              onChange={e => setCorrectAnswer(e.target.value)} 
              placeholder="Enter the exact answer key"
            />
          </div>
        )}

        <button 
          onClick={addQuestion} 
          className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition duration-200 shadow-md"
        >
          Save Question
        </button>
      </div>

      {/* --- LIST OF EXISTING QUESTIONS --- */}
      <div className="space-y-4">
        {questions.length === 0 && <p className="text-center text-gray-500">No questions yet. Add one or Import a JSON file.</p>}
        
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-400">#{i + 1}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                  q.question_type === 'mcq' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {q.question_type === 'mcq' ? 'Multiple Choice' : 'Fill In Blank'}
                </span>
              </div>
              <p className="font-semibold text-lg text-gray-800">{q.question_text}</p>
              <p className="text-sm text-green-600 mt-1">
                <span className="font-bold">Answer:</span> {q.correct_answer}
              </p>
            </div>
            <button 
              onClick={() => deleteQuestion(q.id)} 
              className="text-gray-400 hover:text-red-600 transition p-2"
              title="Delete Question"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}