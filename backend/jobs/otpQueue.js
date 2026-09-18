const { Queue } = require('bullmq');
const { createQueueConnection } = require('../config/queueConnection');

const QUEUE_NAME = 'otp-jobs';

let otpQueue = null;

const getOtpQueue = () => {
  if (!otpQueue) {
    otpQueue = new Queue(QUEUE_NAME, {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s
        removeOnComplete: { count: 500, age: 24 * 60 * 60 }, // keep 24h / last 500
        removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 }, // keep 7d / last 1000 for debugging
      },
    });
  }
  return otpQueue;
};

/**
 * Enqueue an OTP email/SMS job. Resolves as soon as the job is written to
 * Redis (fast) — the actual send happens later in the worker.
 */
const enqueueOtp = async (method, destination, otp) => {
  const jobName = method === 'email' ? 'send-otp-email' : 'send-otp-sms';
  const queue = getOtpQueue();
  return queue.add(
    jobName,
    { method, destination, otp },
    {
      // Prevents duplicate jobs if the same OTP request is fired twice
      // within the same millisecond-ish window (best-effort de-dupe).
      jobId: `otp_${method}_${destination.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`,
    }
  );
};

module.exports = { QUEUE_NAME, getOtpQueue, enqueueOtp };
