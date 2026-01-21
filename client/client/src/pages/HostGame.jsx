import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { supabase } from '../supabase';

const socket = io(import.meta.env.VITE_SERVER_URL); // e.g. 'http://localhost:3001'

export default function HostGame() {
  const { quizId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [gameState, setGameState] = useState({ currentQuestionIndex: 0, state: 'waiting' });
  const [responsesCount, setResponsesCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);

  useEffect(() => {
    // Load Quiz Data
    const loadQuiz = async () => {
      const { data: qData } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('order');
      const { count } = await supabase.from('assignments').select('*', { count: 'exact' }).eq('quiz_id', quizId);
      setQuestions(qData);
      setAssignedCount(count);

      // Start the game on server
      socket.emit('teacher_start_quiz', { quizId });
    };
    loadQuiz();

    socket.on('progress_update', ({ count }) => setResponsesCount(count));
    
    // Cleanup
    return () => socket.disconnect();
  }, [quizId]);

  const currentQ = questions[gameState.currentQuestionIndex];

  const sendAction = (action) => {
    let nextIndex = gameState.currentQuestionIndex;
    if (action === 'next_question') {
      nextIndex++;
      setResponsesCount(0); // Reset for next Q
    }
    
    setGameState(prev => {
        // Optimistic update
        let newStateStr = prev.state;
        if (action === 'end_question') newStateStr = 'locked';
        if (action === 'show_answer') newStateStr = 'result';
        if (action === 'next_question') newStateStr = 'question';
        return { ...prev, state: newStateStr, currentQuestionIndex: nextIndex };
    });

    socket.emit('control_action', { quizId, action, nextIndex });
  };

  if (!currentQ) return <div className="p-10 text-center">Loading or Quiz Finished...</div>;

  return (
    <div className="h-screen flex flex-col bg-purple-900 text-white p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl">Student Progress: {responsesCount} / {assignedCount}</h2>
        <div className="text-4xl font-bold">Q{gameState.currentQuestionIndex + 1}</div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="bg-white text-black p-8 rounded-lg shadow-xl text-3xl text-center mb-8 w-full max-w-4xl">
          {currentQ.question_text}
        </div>

        {gameState.state === 'result' && (
          <div className="bg-green-500 text-white p-4 rounded text-2xl mb-4">
            Correct Answer: {currentQ.correct_answer}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-auto p-8 bg-purple-800 rounded-t-xl">
        {gameState.state === 'question' && (
          <button onClick={() => sendAction('end_question')} className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-lg text-xl font-bold">End Question</button>
        )}
        
        {gameState.state === 'locked' && (
          <button onClick={() => sendAction('show_answer')} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-bold">Show Answer</button>
        )}

        {gameState.state === 'result' && (
          gameState.currentQuestionIndex < questions.length - 1 ? 
          <button onClick={() => sendAction('next_question')} className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-bold">Next Question</button>
          :
          <button onClick={() => sendAction('finish_quiz')} className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-lg text-xl font-bold">Finish Quiz</button>
        )}
      </div>
    </div>
  );
}