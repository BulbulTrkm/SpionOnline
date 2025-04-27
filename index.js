// SERVER CODE (Node.js + Express + Socket.IO)

// 1. Vorher: npm install express socket.io cors

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Erlaube alle Domains (z.B. Netlify Frontend)
    methods: ['GET', 'POST']
  }
});

// Speicher für alle Lobbys
const lobbies = {};

io.on('connection', (socket) => {
  console.log('🟢 Neue Verbindung:', socket.id);

  // Lobby erstellen
  socket.on('createLobby', ({ playerName }, callback) => {
    const lobbyCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    lobbies[lobbyCode] = {
      players: [{ id: socket.id, name: playerName }],
      started: false
    };
    socket.join(lobbyCode);
    callback({ lobbyCode });
  });

  // Lobby beitreten
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

  // Spiel starten
  socket.on('startGame', ({ lobbyCode, spyCount, category }) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return;

    const wordCategories = {
      'Geografie': ["Äquator", "Insel", "Fluss", "Gebirge", "Wüste"],
      'Geschichte': ["Römisches Reich", "Mittelalter", "Revolution", "Pyramiden"],
      'Anime': ["Naruto", "Goku", "Luffy", "Titan"],
      'Filme und Serien': ["Harry Potter", "Frodo", "Breaking Bad"],
      'Bekannte Persönlichkeiten': ["Einstein", "Newton", "Tesla"]
    };

    const wordList = wordCategories[category] || wordCategories['Geografie'];
    const secretWord = wordList[Math.floor(Math.random() * wordList.length)];

    const shuffledPlayers = [...lobby.players].sort(() => 0.5 - Math.random());
    const spies = shuffledPlayers.slice(0, spyCount);

    shuffledPlayers.forEach(player => {
      const isSpy = spies.some(spy => spy.id === player.id);
      io.to(player.id).emit('gameData', {
        category,
        role: isSpy ? 'Spion' : secretWord
      });
    });

    lobby.started = true;
  });

  // Disconnect / Spieler verlässt das Spiel
  socket.on('disconnect', () => {
    console.log('🔴 Verbindung getrennt:', socket.id);
    for (const lobbyCode in lobbies) {
      lobbies[lobbyCode].players = lobbies[lobbyCode].players.filter(p => p.id !== socket.id);
      io.to(lobbyCode).emit('updatePlayers', lobbies[lobbyCode].players);
    }
  });
});

// Test-Route
app.get('/', (req, res) => {
  res.send('🕵️ Spion Backend läuft!');
});

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
