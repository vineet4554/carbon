const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecopilot';
    const safeUri = uri.replace(/\/\/([^@/]+)@/, '//<credentials>@');
    console.log(`Connecting to MongoDB at: ${safeUri}`);
    await mongoose.connect(uri);
    console.log('MongoDB connection established successfully.');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
