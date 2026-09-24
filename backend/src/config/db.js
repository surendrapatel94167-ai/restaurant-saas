import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

const connectDB = async () => {
  try {
    // MONGO_URI here is expected to be a MongoDB Atlas SRV connection string, e.g.
    // mongodb+srv://<user>:<password>@<cluster>.mongodb.net/restaurant-saas?retryWrites=true&w=majority
    await mongoose.connect(MONGO_URI);
    console.log('[db] MongoDB Atlas connected');
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    process.exit(1);
  }
};

export default connectDB;
