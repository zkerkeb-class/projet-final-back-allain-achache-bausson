const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const garmentsRouter = require('./routes/garments');
const aiRouter = require('./routes/ai');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not set. Add it to .env');
}

mongoose
  .connect(MONGODB_URI || '')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/garments', garmentsRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
