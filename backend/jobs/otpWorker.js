const { Worker } = require('bullmq');
const { createQueueConnection } = require('../config/queueConnection');
const { QUEUE_NAME } = require('./otpQueue');
const { sendOTPEmail } = require('../utils/email');
const { sendOTPSms } = require('../utils/sms');

const REDIS_ENABLED = (process.env.REDIS_ENABLED || 'true').toLowerCase() !== 'false';

let workerInstance = null;

const processOtpJob = async (job) => {
  const { method, destination, otp } = job.data;
  if (method === 'email') {
    await sendOTPEmail(destination, otp);
  } else {
    await sendOTPSms(destination, otp);
  }
};

/**
 * Starts (once) the BullMQ worker that consumes the 'otp-jobs' queue and
 * actually sends the email/SMS. Safe to call multiple times — returns the
 * existing worker if already running. No-ops if Redis is disabled.
 */
const startOtpWorker = () => {
  if (!REDIS_ENABLED) {
    console.log('Redis disabled — OTP worker not started (using direct-send fallback)');
    return null;
  }
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(QUEUE_NAME, processOtpJob, {
    connection: createQueueConnection(),
    concurrency: Number(process.env.OTP_WORKER_CONCURRENCY || 5),
  });

  workerInstance.on('completed', (job) => {
    console.log(`[otp-worker] job ${job.id} (${job.name} -> ${job.data.destination}) sent`);
  });

  workerInstance.on('failed', (job, err) => {
    console.error(
      `[otp-worker] job ${job?.id} (${job?.name} -> ${job?.data?.destination}) failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      err.message
    );
  });

  console.log(`OTP/email worker started (concurrency=${workerInstance.opts.concurrency})`);
  return workerInstance;
};

const stopOtpWorker = async () => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};

module.exports = { startOtpWorker, stopOtpWorker };
