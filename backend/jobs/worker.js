// Standalone worker process. Run this separately from the API server when
// you want to scale OTP/email sending independently (e.g. `npm run worker`,
// or as its own container/PM2 process). By default the same worker also
// auto-starts inside the API process (see server.js) so nothing extra is
// required for small deployments — set RUN_WORKER_IN_PROCESS=false on the
// API server once you run this file separately, to avoid double-processing.
require('dotenv').config();

const { startOtpWorker } = require('./otpWorker');

console.log('Starting OTP/email worker process...');
const worker = startOtpWorker();

if (!worker) {
  console.log('Worker did not start (Redis disabled). Exiting.');
  process.exit(0);
}

const shutdown = async (signal) => {
  console.log(`\n${signal} received: closing OTP worker gracefully...`);
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
