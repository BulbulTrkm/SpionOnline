// SERVER CODE (Node.js + Express + Socket.IO)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const lobbies = {};

io.on('connection', (socket) => {
  console.log('🟢 Neue Verbindung:', socket.id);

  socket.on('createLobby', ({ playerName }, callback) => {
    const lobbyCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    lobbies[lobbyCode] = {
      players: [{ id: socket.id, name: playerName }],
      started: false,
      ownerId: socket.id,
      currentSpies: []
    };
    socket.join(lobbyCode);
    io.to(lobbyCode).emit('updatePlayers', lobbies[lobbyCode].players);
    callback({ lobbyCode });
  });

  socket.on('joinLobby', ({ lobbyCode, playerName }, callback) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby || lobby.started) {
      return callback({ error: 'Lobby nicht gefunden oder schon gestartet.' });
    }
    lobby.players.push({ id: socket.id, name: playerName });
    socket.join(lobbyCode);
    io.to(lobbyCode).emit('updatePlayers', lobby.players);
    callback({ success: true });
  });

  socket.on('startGame', ({ lobbyCode, spyCount, category }) => {
    startNewGame(lobbyCode, spyCount, category);
  });

  socket.on('endGame', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby || lobby.ownerId !== socket.id) return;
    const spyNames = lobby.currentSpies.map(p => p.name);
    io.to(lobbyCode).emit('gameEnd', { spyNames });
    lobby.started = false;
  });

  socket.on('restartGame', ({ lobbyCode, spyCount, category }) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby || lobby.ownerId !== socket.id || lobby.started) return;
    startNewGame(lobbyCode, spyCount, category);
  });

  function startNewGame(lobbyCode, spyCount, category) {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return;

    const wordCategories = {
      'Geografie': ["Äquator", "Insel", "Fluss", "Gebirge", "Wüste"],
      'Geschichte': ["Römisches Reich", "Mittelalter", "Revolution", "Pyramiden"],
      'Anime': ["Naruto", "Goku", "Luffy", "Titan"],
      'Filme und Serien': ["Harry Potter", "Frodo", "Breaking Bad"],
      'Bekannte Persönlichkeiten': ["Einstein", "Newton", "Tesla"]
    };

    let actualCategory = category;
    if (category === 'Zufall') {
      const categories = Object.keys(wordCategories);
      actualCategory = categories[Math.floor(Math.random() * categories.length)];
    }

    const wordList = wordCategories[actualCategory];
    const secretWord = wordList[Math.floor(Math.random() * wordList.length)];

    const shuffledPlayers = [...lobby.players].sort(() => 0.5 - Math.random());
    const spies = shuffledPlayers.slice(0, spyCount);
    lobby.currentSpies = spies;
    lobby.started = true;

    shuffledPlayers.forEach(player => {
      const isSpy = spies.some(spy => spy.id === player.id);
      io.to(player.id).emit('gameData', {
        category: actualCategory,
        role: isSpy ? 'Spion' : secretWord
      });
    });

    io.to(lobbyCode).emit('updatePlayers', lobby.players);
  }

  socket.on('disconnect', () => {
    console.log('🔴 Verbindung getrennt:', socket.id);
    for (const code in lobbies) {
      lobbies[code].players = lobbies[code].players.filter(p => p.id !== socket.id);
      io.to(code).emit('updatePlayers', lobbies[code].players);
    }
  });
});

app.get('/', (req, res) => {
  res.send('🕵️ Spion Backend läuft!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
