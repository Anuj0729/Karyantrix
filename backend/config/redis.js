const { createClient } = require('redis');

// Toggle: set REDIS_ENABLED=false to run Socket.IO with the default
// in-memory adapter (useful for local single-instance dev without Redis).
const REDIS_ENABLED = (process.env.REDIS_ENABLED || 'true').toLowerCase() !== 'false';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let pubClient = null;
let subClient = null;

/**
 * Creates (if needed) and connects the Redis pub/sub client pair used by
 * the Socket.IO Redis adapter. Returns { pubClient, subClient } on success,
 * or null if Redis is disabled/unreachable so the caller can fall back to
 * Socket.IO's default in-memory adapter.
 */
const connectRedis = async () => {
  if (!REDIS_ENABLED) {
    console.log('Redis adapter disabled (REDIS_ENABLED=false) — using in-memory Socket.IO adapter');
    return null;
  }

  try {
    pubClient = createClient({ url: REDIS_URL });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err.message));
    subClient.on('error', (err) => console.error('Redis Sub Client Error:', err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);

    console.log(`Redis connected for Socket.IO adapter (${REDIS_URL})`);
    return { pubClient, subClient };
  } catch (err) {
    console.error('Redis connection failed, falling back to in-memory Socket.IO adapter:', err.message);
    return null;
  }
};

const disconnectRedis = async () => {
  await Promise.all(
    [pubClient, subClient]
      .filter((client) => client && client.isOpen)
      .map((client) => client.quit().catch(() => {}))
  );
};

module.exports = { connectRedis, disconnectRedis, REDIS_URL, REDIS_ENABLED };
