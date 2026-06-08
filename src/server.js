require('dotenv').config();

const { createApp } = require('./app');

const port = Number(process.env.PORT || 8080);
const app = createApp();

app.listen(port, () => {
  console.log(`Kabaddi live-score backend is running on http://localhost:${port}`);
});

