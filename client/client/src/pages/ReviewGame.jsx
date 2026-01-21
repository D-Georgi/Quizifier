import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ReviewGame({ session }) {
  const { quizId } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      // Fetch results and join with the question details to show context
      const { data, error } = await supabase
        .from('results')
        .select(`
          *,
          questions (
            question_text,
            correct_answer
          )
        `)
        .eq('quiz_id', quizId)
        .eq('student_id', session.user.id)
        .order('id', { ascending: true }); // Should ideally order by question order

      if (error) console.error('Error fetching review:', error);
      setResults(data || []);
      setLoading(false);
    };

    fetchResults();
  }, [quizId, session.user.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your results...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Quiz Review</h1>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold">
             &larr; Back to Dashboard
          </Link>
        </div>

        {results.length === 0 ? (
          <div className="bg-white p-8 rounded shadow text-center">
            <p>No answers recorded for this quiz.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((item, index) => (
              <div 
                key={item.id} 
                className={`border-l-8 p-6 rounded-lg shadow-md bg-white ${
                  item.is_correct ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    Question {index + 1}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    item.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <p className="text-lg text-gray-700 mb-4 font-medium">
                  {item.questions.question_text}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-xs text-gray-500 uppercase font-bold">Your Answer</span>
                    <p className={`text-lg font-semibold ${item.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                      {item.student_answer || "(No Answer)"}
                    </p>
                  </div>
                  
                  {!item.is_correct && (
                    <div className="bg-green-50 p-3 rounded">
                      <span className="text-xs text-green-800 uppercase font-bold">Correct Answer</span>
                      <p className="text-lg font-semibold text-green-700">
                        {item.questions.correct_answer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}