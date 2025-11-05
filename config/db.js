import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Don't reconnect if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return mongoose.connection;
    }

    if (mongoose.connection.readyState === 2) {
      console.log('MongoDB connection in progress, waiting...');
      // Wait for connection to be established
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
      return mongoose.connection;
    }

    // Configure mongoose for serverless/Vercel
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);

    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1, // Limit connections for serverless
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      family: 4, // Use IPv4
      retryWrites: true,
      retryReads: true
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    return conn.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    throw error;
  }
};

export default connectDB;