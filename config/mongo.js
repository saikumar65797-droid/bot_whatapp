const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose
 * Supports both direct URI values and username/password env variables.
 */
const connectDB = async () => {
  try {
    const user = process.env.MONGODB_USER;
    const pass = process.env.MONGODB_PASS;
    const dbName = process.env.MONGODB_DB || 'Manufacturing_Unit';

    let connStr = process.env.MONGODB_URI;

    if (!connStr && user && pass) {
      connStr = `mongodb+srv://${user}:${pass}@${process.env.MONGODB_HOST || 'cluster0.mongodb.net'}/${dbName}?retryWrites=true&w=majority`;
    }

    if (!connStr) {
      console.warn('⚠️ MONGODB_URI is not defined in environment variables.');
      return;
    }

    const options = dbName ? { dbName } : {};
    const conn = await mongoose.connect(connStr, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Do not crash server process on DB connection fail, allow web server to run
  }
};

module.exports = connectDB;
