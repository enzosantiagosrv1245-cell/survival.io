const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const Database = require('./database');
const Game = require('./game');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const config = require('./config');

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

const db = new Database();
const game = new Game(io, db);

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.createUser(username, password);
    res.json({ success: true, userId: result.id });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.authenticateUser(username, password);
    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  const leaderboard = await db.getLeaderboard();
  res.json(leaderboard);
});

app.get('/api/stats/:userId', async (req, res) => {
  const stats = await db.getUserStats(req.params.userId);
  res.json(stats);
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', (data) => {
    game.addPlayer(socket, data);
  });

  socket.on('input', (input) => {
    game.handleInput(socket.id, input);
  });

  socket.on('chat', (message) => {
    game.handleChat(socket.id, message);
  });

  socket.on('craft', (recipe) => {
    game.handleCraft(socket.id, recipe);
  });

  socket.on('disconnect', () => {
    game.removePlayer(socket.id);
    console.log('Player disconnected:', socket.id);
  });
});

game.start();

const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`Survival.io server running on port ${PORT}`);
});