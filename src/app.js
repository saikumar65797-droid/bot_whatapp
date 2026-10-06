const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const connectDB = require('./config/database');
const webhookRoutes = require('./routes/webhookRoutes');
const logger = require('./utils/logger');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Render/Heroku deployments (required for rate limiting)
app.set('trust proxy', true);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit because Meta can send huge bursts of retries
  message: 'Too many requests from this IP, please try again later.',
});

// Apply rate limiter to webhook endpoint
app.use('/webhook', limiter, webhookRoutes);

// Root route for simple verification in browser
app.get('/', (req, res) => {
  res.send('Sruthi Technologies WhatsApp Chatbot is running! 🚀');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = env.port;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

module.exports = app;
