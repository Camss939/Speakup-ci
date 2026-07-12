import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chat } from './routes/chat.js';
import { transcribe } from './routes/transcribe.js';
import { getAllUsers, patchUser, removeUser } from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, cb) => {
    // Allow any localhost port + the configured CLIENT_URL
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || origin === process.env.CLIENT_URL) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.post('/api/chat', chat);
app.post('/api/transcribe', transcribe);
app.get('/api/admin/users', getAllUsers);
app.patch('/api/admin/users/:id', patchUser);
app.delete('/api/admin/users/:id', removeUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
