require('dotenv').config();
const express = require('express');
const connectDB = require('./config/mongo');

const webhookRoutes = require('./routes/webhook');
const customerRoutes = require('./routes/customers');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

const path = require('path');

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Public Static Files (Brochure PDF)
app.use('/public', express.static(path.join(__dirname, 'public')));


// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Sruthi Technologies WhatsApp Chatbot Service',
    timestamp: new Date().toISOString()
  });
});

// Register Application Routes
app.use('/', webhookRoutes);
app.use('/', customerRoutes);

// ── Admin: Session Management ──────────────────────────────────────────────
// Protected by ADMIN_KEY env var. Use these to clear stale sessions after deploys.
const { clearUserState } = require('./utils/userState');
const UserSession = require('./models/UserSession');

const adminAuth = (req, res, next) => {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// Clear ALL active sessions (use after a deploy with breaking state changes)
app.get('/admin/reset-all-sessions', adminAuth, async (req, res) => {
  try {
    const result = await UserSession.deleteMany({});
    res.json({ success: true, message: `Cleared ${result.deletedCount} sessions` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear a single user's session by phone number
app.get('/admin/reset-session/:phone', adminAuth, async (req, res) => {
  try {
    const phone = req.params.phone;
    clearUserState(phone);
    res.json({ success: true, message: `Session cleared for ${phone}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('❌ Internal Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Express HTTP Server
app.listen(PORT, () => {
  console.log(`🚀 Sruthi Technologies WhatsApp Chatbot Server running on port ${PORT}`);
});
