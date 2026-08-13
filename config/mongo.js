const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose
 */
const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      console.warn('⚠️ MONGODB_URI is not defined in environment variables.');
      return;
    }

    const options = process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {};
    const conn = await mongoose.connect(connStr, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Do not crash server process on DB connection fail, allow web server to run
  }
};

module.exports = connectDB;
