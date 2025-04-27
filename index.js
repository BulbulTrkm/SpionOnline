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
      "Geografie": [
        "Äquator", "Kontinent", "Insel", "Gebirge", "Tal", "Wüste", "See", "Fluss",
        "Halbinsel", "Küste", "Archipel", "Gletscher", "Krater", "Vulkan", "Wolkenkratzer",
        "Wald", "Steppe", "Dschungel", "Kanal", "Ebene", "Ozean", "Mittelmeer", "Pazifik",
        "Alpen", "Sahara", "Nil", "Amazonas", "Donau", "Himalaya", "Rocky Mountains",
        "Anden", "Nordpol", "Südpol", "Ägäis", "Balkan", "Skandinavien", "Sibirien", "Kaukasus",
        "Grand Canyon", "Kap der Guten Hoffnung", "Panamakanal", "Everest", "Marianengraben",
        "Tundra", "Savanne", "Regenwald", "Plateau", "Atoll", "Mündung", "Hochebene"
      ],
              "Geschichte": [
        "Römisches Reich", "Mittelalter", "Renaissance", "Französische Revolution",
        "Weltkrieg", "Kalter Krieg", "Berliner Mauer", "Pyramiden", "Kreuzzug", "Kaiser",
        "Adel", "Imperium", "Pharao", "Republik", "Demokratie", "Monarchie", "Sklaverei",
        "Vikinger", "Sparta", "Troja", "Alexander der Große", "Cäsar", "Napoleon", "Hitler",
        "Churchill", "DDR", "NS-Zeit", "Weimarer Republik", "Industrialisierung", "Kolonialismus",
        "Entdeckung Amerikas", "D-Day", "Mauerfall", "Wikinger", "Gladiator", "Hiroshima",
        "Revolution", "Gulag", "Inquisition", "Schlacht", "Erster Weltkrieg", "Zweiter Weltkrieg",
        "Martin Luther", "Bismarck", "Stalin", "Lincoln", "Versailles", "Vietnamkrieg",
        "Atlantis", "Papst"
      ],
              "Anime": [
        "Naruto", "Sasuke", "Konoha", "Akatsuki", "Sharingan", "Bleach", "Ichigo", "Soul Reaper",
        "One Piece", "Luffy", "Zorro", "Nami", "Grand Line", "Dragon Ball", "Goku", "Vegeta",
        "Kamehameha", "Attack on Titan", "Eren", "Mikasa", "Titan", "Death Note", "Light",
        "L", "Notebook", "My Hero Academia", "Deku", "Bakugo", "All Might", "Quirk",
        "Demon Slayer", "Tanjiro", "Nezuko", "Hashira", "Inosuke", "Zenitsu", "Sword Art Online",
        "Kirito", "Asuna", "Fairy Tail", "Natsu", "Erza", "Lucy", "Pokémon", "Pikachu", "Ash",
        "Pokéball", "Jujutsu Kaisen", "Gojo", "Itadori", "Nanami", "Hunter x Hunter", "Gon",
        "Killua", "Hisoka", "Fullmetal Alchemist", "Edward", "Alphonse", "Alchemy",
        "Black Clover", "Asta", "Yuno", "Magic Knight", "Tokyo Ghoul", "Kaneki", "RC-Zelle",
        "Berserk", "Guts", "Griffith", "Chainsaw Man", "Denji", "Makima", "Power", "Mob Psycho",
        "Mob", "Reigen", "Spy x Family", "Loid", "Anya", "Yor", "Code Geass", "Lelouch", "C.C.",
        "Evangelion", "Shinji", "Asuka", "Rei", "Haikyuu", "Hinata", "Kageyama", "Karasuno",
        "Your Name", "Silent Voice", "Howl’s Moving Castle", "Totoro", "Studio Ghibli"
      ],
              "Filme und Serien": [
        "Breaking Bad", "Walter White", "Heisenberg", "Jesse Pinkman", "Game of Thrones", "Jon Snow",
        "Daenerys", "Winterfell", "Stranger Things", "Eleven", "Demogorgon", "Hawkins", "The Office",
        "Dwight", "Michael Scott", "Friends", "Ross", "Rachel", "Monica", "Chandler", "Harry Potter",
        "Hogwarts", "Voldemort", "Dumbledore", "Hermione", "Ron", "Lord of the Rings", "Frodo",
        "Gandalf", "Sauron", "Hobbit", "Avengers", "Iron Man", "Captain America", "Thanos", "Thor",
        "Hulk", "Black Widow", "Loki", "Star Wars", "Luke Skywalker", "Darth Vader", "Yoda", "Leia",
        "Obi-Wan", "Mandalorian", "Grogu", "Batman", "Joker", "Gotham", "Spider-Man", "Peter Parker",
        "MJ", "Green Goblin", "Stranger Things", "Squid Game", "Red Light Green Light", "Money Heist",
        "Professor", "Berlin", "Tokyo", "Narcos", "Pablo Escobar", "House of Cards", "Underwood",
        "Sherlock", "Watson", "Dracula", "Lucifer", "Dexter", "Wednesday", "Wednesday Addams",
        "The Crown", "Queen Elizabeth", "Peaky Blinders", "Tommy Shelby", "Dark", "Jonas", "Martha",
        "Black Mirror", "Bandersnatch", "The Witcher", "Geralt", "Yennefer", "The Boys", "Homelander",
        "Starlight", "Invincible", "Mark Grayson", "Omni-Man", "John Wick", "Matrix", "Neo", "Trinity",
        "Inception", "Leonardo DiCaprio", "Titanic", "Jack", "Rose", "Shrek", "Donkey"
      ],
            "Bekannte Persönlichkeiten": [
        "Albert Einstein", "Isaac Newton", "Galileo Galilei", "Marie Curie", "Stephen Hawking",
        "Leonardo da Vinci", "Nikola Tesla", "Elon Musk", "Steve Jobs", "Bill Gates",
        "Barack Obama", "Angela Merkel", "Winston Churchill", "Adolf Hitler", "Joseph Stalin",
        "Nelson Mandela", "Martin Luther King", "Mahatma Gandhi", "Wladimir Putin", "Joe Biden",
        "Donald Trump", "Karl Marx", "Che Guevara", "Napoleon Bonaparte", "Alexander der Große",
        "Cleopatra", "Julius Caesar", "Queen Elizabeth II", "Prinz Harry", "Prinz William",
        "Lady Diana", "Taylor Swift", "Michael Jackson", "Elvis Presley", "Freddie Mercury",
        "Beyoncé", "Ariana Grande", "Drake", "Rihanna", "Ed Sheeran",
        "Cristiano Ronaldo", "Lionel Messi", "Pelé", "Diego Maradona", "Serena Williams",
        "Roger Federer", "Lewis Hamilton", "Usain Bolt", "Michael Schumacher", "Dirk Nowitzki",
        "Tom Brady", "Tiger Woods", "Neymar", "Kylian Mbappé", "Mohamed Salah", "Zinedine Zidane",
        "Tom Cruise", "Leonardo DiCaprio", "Brad Pitt", "Johnny Depp", "Keanu Reeves",
        "Angelina Jolie", "Jennifer Lawrence", "Emma Watson", "Dwayne Johnson", "Chris Hemsworth",
        "Robert Downey Jr.", "Scarlett Johansson", "Ryan Reynolds", "Will Smith", "Morgan Freeman",
        "Oprah Winfrey", "Greta Thunberg", "Malala Yousafzai", "Anne Frank", "Florence Nightingale",
        "Karl Lagerfeld", "Coco Chanel", "Walt Disney", "Stan Lee", "Hayao Miyazaki",
        "Shakira", "Billie Eilish", "Mark Zuckerberg", "Jeff Bezos", "Pablo Picasso",
        "Vincent van Gogh", "Mozart", "Beethoven", "Ludwig van Beethoven", "Wolfgang Amadeus Mozart",
        "Frida Kahlo", "Banksy", "George Washington", "Abraham Lincoln", "John F. Kennedy",
        "Kim Kardashian", "Kanye West", "Justin Bieber", "Harry Styles", "Zendaya"
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
