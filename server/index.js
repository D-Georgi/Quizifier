require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// In-memory game state management
// Structure: { quizId: { currentQuestionIndex: 0, state: 'waiting' | 'question' | 'locked' | 'result', answers: {} } }
const gameRooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // TEACHER: Start Quiz
  socket.on('teacher_start_quiz', async ({ quizId }) => {
    // Reset or Initialize room
    gameRooms[quizId] = {
      currentQuestionIndex: 0,
      state: 'question', // Immediately show first question
      answers: {}, // { studentId: { answer: '...', correct: true/false } }
      activeStudents: new Set()
    };
    
    // Update DB status to active
    await supabase.from('quizzes').update({ status: 'active' }).eq('id', quizId);
    
    socket.join(quizId);
    io.to(quizId).emit('game_state_update', gameRooms[quizId]);
  });

  // STUDENT: Join Room
  socket.on('student_join', ({ quizId, studentId }) => {
    socket.join(quizId);
    if (gameRooms[quizId]) {
      gameRooms[quizId].activeStudents.add(studentId);
      // Send current state to late joiner
      socket.emit('game_state_update', gameRooms[quizId]);
    } else {
      socket.emit('error', 'Quiz not active');
    }
  });

  // STUDENT: Submit Answer
  socket.on('submit_answer', async ({ quizId, studentId, questionId, answer, isCorrect }) => {
    if (!gameRooms[quizId]) return;
    
    // Record in memory
    if (!gameRooms[quizId].answers[gameRooms[quizId].currentQuestionIndex]) {
        gameRooms[quizId].answers[gameRooms[quizId].currentQuestionIndex] = [];
    }
    
    gameRooms[quizId].answers[gameRooms[quizId].currentQuestionIndex].push({ studentId, answer });

    // Persist to DB
    await supabase.from('results').insert({
      quiz_id: quizId,
      student_id: studentId,
      question_id: questionId,
      student_answer: answer,
      is_correct: isCorrect
    });

    // Notify teacher of progress
    const count = gameRooms[quizId].answers[gameRooms[quizId].currentQuestionIndex].length;
    io.to(quizId).emit('progress_update', { count });
  });

  // TEACHER: Controls
  socket.on('control_action', async ({ quizId, action, nextIndex }) => {
    if (!gameRooms[quizId]) return;

    if (action === 'end_question') {
      gameRooms[quizId].state = 'locked';
    } else if (action === 'show_answer') {
      gameRooms[quizId].state = 'result';
    } else if (action === 'next_question') {
      gameRooms[quizId].currentQuestionIndex = nextIndex;
      gameRooms[quizId].state = 'question';
    } else if (action === 'finish_quiz') {
      gameRooms[quizId].state = 'finished';
      await supabase.from('quizzes').update({ status: 'completed' }).eq('id', quizId);
    }

    io.to(quizId).emit('game_state_update', gameRooms[quizId]);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));