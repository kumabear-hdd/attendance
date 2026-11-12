import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  INITIAL_CLASSES,
  INITIAL_RECORDS,
  INITIAL_SCHOOL_PROFILE,
  INITIAL_STUDENTS,
  StorageData,
} from './src/data/initialData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'attendance_store.json');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

interface RoomState {
  version: number;
  updatedAt: string;
  data: StorageData;
}

// In-memory store keyed by room ID
const roomStore: Map<string, RoomState> = new Map();

function getInitialRoomData(): StorageData {
  return {
    students: INITIAL_STUDENTS,
    classes: INITIAL_CLASSES,
    records: INITIAL_RECORDS,
    schoolProfile: INITIAL_SCHOOL_PROFILE,
  };
}

// Ensure persistence directory exists and load persisted data
function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [roomId, state] of Object.entries(parsed)) {
          const roomObj = state as RoomState;
          if (roomObj && roomObj.data && typeof roomObj.version === 'number') {
            roomStore.set(roomId, roomObj);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Server] Error loading persistence file:', err);
  }

  // Ensure default room exists
  const defaultRoom = 'mustaqbal';
  if (!roomStore.has(defaultRoom)) {
    roomStore.set(defaultRoom, {
      version: 1,
      updatedAt: new Date().toISOString(),
      data: getInitialRoomData(),
    });
    saveStoreToDisk();
  }
}

function saveStoreToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized: Record<string, RoomState> = {};
    for (const [key, val] of roomStore.entries()) {
      serialized[key] = val;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Error saving persistence file:', err);
  }
}

initStore();

// --- API ROUTES ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    roomsCount: roomStore.size,
  });
});

// GET /api/data?room=mustaqbal
app.get('/api/data', (req, res) => {
  const roomId = ((req.query.room as string) || 'mustaqbal').trim().toLowerCase();

  let room = roomStore.get(roomId);
  if (!room) {
    room = {
      version: 1,
      updatedAt: new Date().toISOString(),
      data: getInitialRoomData(),
    };
    roomStore.set(roomId, room);
    saveStoreToDisk();
  }

  res.json({
    success: true,
    room: roomId,
    version: room.version,
    updatedAt: room.updatedAt,
    data: room.data,
  });
});

// POST /api/data
app.post('/api/data', (req, res) => {
  const roomId = ((req.body.room as string) || (req.query.room as string) || 'mustaqbal')
    .trim()
    .toLowerCase();
  const incomingData = req.body.data as StorageData;

  if (!incomingData || !Array.isArray(incomingData.students) || !Array.isArray(incomingData.classes)) {
    return res.status(400).json({ success: false, error: 'Invalid data format' });
  }

  let room = roomStore.get(roomId);
  const nextVersion = (room ? room.version : 0) + 1;
  const now = new Date().toISOString();

  const updatedRoom: RoomState = {
    version: nextVersion,
    updatedAt: now,
    data: {
      students: incomingData.students,
      classes: incomingData.classes,
      records: Array.isArray(incomingData.records) ? incomingData.records : [],
      schoolProfile: incomingData.schoolProfile || INITIAL_SCHOOL_PROFILE,
    },
  };

  roomStore.set(roomId, updatedRoom);
  saveStoreToDisk();

  res.json({
    success: true,
    room: roomId,
    version: updatedRoom.version,
    updatedAt: updatedRoom.updatedAt,
  });
});

// GET /api/sync?room=mustaqbal&version=12
app.get('/api/sync', (req, res) => {
  const roomId = ((req.query.room as string) || 'mustaqbal').trim().toLowerCase();
  const clientVersion = Number(req.query.version) || 0;

  const room = roomStore.get(roomId);
  if (!room) {
    return res.json({ hasUpdate: false, version: 0 });
  }

  if (room.version > clientVersion) {
    return res.json({
      hasUpdate: true,
      room: roomId,
      version: room.version,
      updatedAt: room.updatedAt,
      data: room.data,
    });
  }

  res.json({
    hasUpdate: false,
    room: roomId,
    version: room.version,
    updatedAt: room.updatedAt,
  });
});

// POST /api/reset
app.post('/api/reset', (req, res) => {
  const roomId = ((req.body.room as string) || (req.query.room as string) || 'mustaqbal')
    .trim()
    .toLowerCase();

  const resetRoom: RoomState = {
    version: (roomStore.get(roomId)?.version || 0) + 1,
    updatedAt: new Date().toISOString(),
    data: getInitialRoomData(),
  };

  roomStore.set(roomId, resetRoom);
  saveStoreToDisk();

  res.json({
    success: true,
    room: roomId,
    version: resetRoom.version,
    updatedAt: resetRoom.updatedAt,
    data: resetRoom.data,
  });
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SI-Hadir] Server running at http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
