require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const { connectDB } = require('./config/db');
const {
  UPLOAD_ROOT,
  LEGACY_UPLOAD_ROOT,
  ensureDir,
  EXPLICIT_MIME_BY_EXT,
} = require('./config/storage');
require('./models');
const { initSocket } = require('./sockets/socketHandler');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceCatalogRoutes = require('./routes/serviceCatalogRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const providerRoutes = require('./routes/providerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const supportRoutes = require('./routes/supportRoutes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5175')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOriginCheck = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin "${origin}" is not allowed by CORS`));
  }
};

const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    credentials: true,
  },
  path: '/socket.io',
  addTrailingSlash: false,
});

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({ origin: corsOriginCheck, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(mongoSanitize());
app.use(hpp());

const staticMediaOptions = {
  maxAge: '30d',
  immutable: true,
  etag: true,
  lastModified: true,
  fallthrough: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (EXPLICIT_MIME_BY_EXT[ext]) res.type(EXPLICIT_MIME_BY_EXT[ext]);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
  },
};

app.use('/uploads', express.static(ensureDir(UPLOAD_ROOT), staticMediaOptions));
if (UPLOAD_ROOT !== LEGACY_UPLOAD_ROOT) {
  app.use('/uploads', express.static(LEGACY_UPLOAD_ROOT, staticMediaOptions));
}
app.use(cookieParser());
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'karyantrix-backend', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Karyantrix API Docs',
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/service-catalog', serviceCatalogRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/support', supportRoutes);

app.use(notFound);
app.use(errorHandler);

initSocket(io);

const PORT = process.env.PORT || 5000;

const start = async () => {
  console.log('Starting server.......')
  await connectDB();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  start();
}

module.exports = { app, server };
