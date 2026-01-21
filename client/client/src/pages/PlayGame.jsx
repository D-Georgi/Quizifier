import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { supabase } from '../supabase';

const socket = io(import.meta.env.VITE_SERVER_URL);

export default function PlayGame({ session }) {
  const { quizId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [serverState, setServerState] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null); // Correct/Incorrect

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('order');
      setQuestions(data);
      socket.emit('student_join', { quizId, studentId: session.user.id });
    };
    init();

    socket.on('game_state_update', (state) => {
      setServerState(state);
      // If state changes to question, reset local submission
      if (state.state === 'question') {
        setSubmitted(false);
        setFeedback(null);
      }
    });

    return () => socket.disconnect();
  }, [quizId]);

  const submitAnswer = (answer) => {
    if (serverState.state !== 'question' || submitted) return;
    
    const currentQ = questions[serverState.currentQuestionIndex];
    const isCorrect = answer === currentQ.correct_answer;
    
    socket.emit('submit_answer', { 
        quizId, 
        studentId: session.user.id, 
        questionId: currentQ.id, 
        answer, 
        isCorrect 
    });
    
    setSubmitted(true);
    // Feedback is hidden until teacher shows answer
  };

  if (!serverState || !questions.length) return <div className="text-center mt-10">Waiting for teacher...</div>;

  const currentQ = questions[serverState.currentQuestionIndex];
  const isLocked = serverState.state !== 'question';
  const showResult = serverState.state === 'result';

  return (
    <div className="h-screen bg-blue-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-4 text-white text-center font-bold">
           {showResult ? (submitted ? "Let's see..." : "Time's up!") : "Answer Now!"}
        </div>
        
        <div className="p-6">
          {showResult && (
             <div className={`text-center text-2xl font-bold mb-4 ${currentQ.correct_answer === (submitted ? "YOUR_LOGIC_NEEDED_HERE" : "") ? "text-green-500" : "text-gray-800"}`}>
               {/* Simplified feedback logic for brevity */}
               Correct Answer: {currentQ.correct_answer}
             </div>
          )}

          {currentQ.question_type === 'mcq' ? (
            <div className="grid grid-cols-2 gap-4">
               {currentQ.options.map((opt, idx) => (
                 <button
                   key={idx}
                   disabled={isLocked || submitted}
                   onClick={() => submitAnswer(opt)}
                   className={`h-24 rounded-lg font-bold text-lg shadow transition-transform transform active:scale-95 ${
                     ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'][idx % 4]
                   } text-white opacity-${(isLocked || submitted) ? '50' : '100'}`}
                 >
                   {opt}
                 </button>
               ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
                <input type="text" id="free-input" className="border p-4 rounded text-xl" placeholder="Type answer..." disabled={isLocked || submitted} />
                <button 
                    onClick={() => submitAnswer(document.getElementById('free-input').value)}
                    disabled={isLocked || submitted}
                    className="bg-black text-white p-4 rounded font-bold"
                >
                    Submit
                </button>
            </div>
          )}
        </div>
        
        <div className="bg-gray-100 p-4 text-center text-gray-500">
           {submitted ? "Answer Sent" : "Waiting for input..."}
        </div>
      </div>
    </div>
  );
}