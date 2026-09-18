const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

mongoose.set('autoIndex', process.env.MONGO_AUTO_INDEX
  ? process.env.MONGO_AUTO_INDEX === 'true'
  : process.env.NODE_ENV !== 'production');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 2,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`Connected to MongoDB at ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = { mongoose, connectDB };
