const express = require('express');
const app = express();

// route simple pour Render
app.get('/', (req, res) => {
  res.send('NOXVELOCITY BOT ONLINE');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
