const express = require('express');
const path = require('path');
const app = express();
const PORT = 5000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.redirect('/tasks.html');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
