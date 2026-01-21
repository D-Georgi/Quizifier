const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// Assume db is your pg pool wrapper

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Live Quiz State (In-memory for speed, persisted to DB on completion)
// Structure: { quizId: { currentQuestionIndex: 0, status: 'WAITING' | 'ACTIVE' | 'SHOW_ANSWER' } }
const liveQuizzes = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // TEACHER EVENTS
  socket.on('TEACHER_START_QUIZ', async ({ quizId }) => {
    liveQuizzes[quizId] = { currentQuestionIndex: 0, status: 'ACTIVE' };
    socket.join(`quiz_${quizId}`);
    // Update DB to set quiz as active
    io.to(`quiz_${quizId}`).emit('SYNC_STATE', liveQuizzes[quizId]);
  });

  socket.on('TEACHER_NEXT_QUESTION', ({ quizId }) => {
    if (liveQuizzes[quizId]) {
      liveQuizzes[quizId].currentQuestionIndex += 1;
      liveQuizzes[quizId].status = 'ACTIVE'; // Reset status to active question view
      io.to(`quiz_${quizId}`).emit('SYNC_STATE', liveQuizzes[quizId]);
    }
  });

  socket.on('TEACHER_SHOW_ANSWER', ({ quizId }) => {
    if (liveQuizzes[quizId]) {
      liveQuizzes[quizId].status = 'SHOW_ANSWER';
      io.to(`quiz_${quizId}`).emit('SYNC_STATE', liveQuizzes[quizId]);
    }
  });

  socket.on('TEACHER_END_QUESTION', ({ quizId }) => {
    if (liveQuizzes[quizId]) {
      liveQuizzes[quizId].status = 'LOCKED'; // Stop accepting answers
      io.to(`quiz_${quizId}`).emit('SYNC_STATE', liveQuizzes[quizId]);
    }
  });

  // STUDENT EVENTS
  socket.on('STUDENT_JOIN_QUIZ', async ({ quizId, studentId }) => {
    socket.join(`quiz_${quizId}`);
    
    // 1. LATE JOIN LOGIC: If quiz is running, send current state immediately
    if (liveQuizzes[quizId]) {
      socket.emit('SYNC_STATE', liveQuizzes[quizId]);
    } else {
      socket.emit('QUIZ_NOT_STARTED');
    }
  });

  socket.on('STUDENT_SUBMIT_ANSWER', async ({ quizId, studentId, answer, questionId }) => {
    // Only accept if question is not locked
    if (liveQuizzes[quizId] && liveQuizzes[quizId].status === 'ACTIVE') {
      // Save to DB: INSERT INTO responses...
      // Notify Teacher View to update "Answers Received" counter
      io.to(`quiz_${quizId}`).emit('UPDATE_COUNTER', { /* count data */ });
    }
  });
});

server.listen(3001, () => {
  console.log('Server running on 3001');
});