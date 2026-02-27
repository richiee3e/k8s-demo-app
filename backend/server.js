const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint (used by ALB)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Main API endpoint
app.get('/api/message', (req, res) => {
  res.status(200).json({
    message: 'Hello from the Backend!',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
