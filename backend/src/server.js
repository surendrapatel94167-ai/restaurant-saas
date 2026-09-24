import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import { PORT } from './config/env.js';
import { startSubscriptionReminderJob } from './jobs/subscriptionReminder.js';

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);
  startSubscriptionReminderJob();

  server.listen(PORT, () => {
    console.log(`[server] Running on port ${PORT}`);
  });
}

start();
