const express = require('express');
const path = require('path');

const app = express();
const PORT = 3100;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta amigable para la sala
app.get('/sala', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sala.html'));
});

// Redirigir /sala.html a /sala
app.get('/sala.html', (req, res) => {
  res.redirect('/sala');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
