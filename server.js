import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes        from './routes/admin.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes         from './routes/users.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

// Allow requests from the Memoera frontend
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://suchithraprints.in',
    'http://localhost:5173',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'memoera-festival-backend' }));

app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users',         usersRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Memoera Festival Backend running on port ${PORT}`);
});
