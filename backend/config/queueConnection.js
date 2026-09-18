const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

/**
 * BullMQ needs its own dedicated ioredis connection(s) — it cannot share
 * the `redis` v4 client used by the Socket.IO adapter, and it requires
 * maxRetriesPerRequest: null so its internal blocking commands (used for
 * waiting on new jobs) don't time out.
 *
 * Call this once per Queue/Worker/QueueEvents instance that needs a
 * connection (BullMQ recommends not sharing a single connection across
 * multiple Queue/Worker instances).
 */
const createQueueConnection = () =>
  new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

module.exports = { createQueueConnection, REDIS_URL };
