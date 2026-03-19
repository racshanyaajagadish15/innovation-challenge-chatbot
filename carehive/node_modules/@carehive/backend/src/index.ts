/**
 * CAREHIVE Backend - Express API + Socket.io
 */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';
import { setIO } from './socket.js';
import { supabase } from './utils/supabaseClient.js';

async function ensureSchema() {
  let ddlRan = false;

  async function runDDL(description: string, sql: string): Promise<boolean> {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      logger.info(`Could not auto-run: ${description}. Run manually: ${sql}`);
      logger.info(`Reason: ${error.message ?? String(error)}`);
      return false;
    }
    logger.info(description);
    ddlRan = true;
    return true;
  }

  // Ensure users.role column exists
  await runDDL(
    'Ensured users.role column',
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'patient';"
  );

  // Ensure user_relationships table
  await runDDL(
    'Ensured user_relationships table',
    `CREATE TABLE IF NOT EXISTS user_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(from_user_id, to_user_id)
    );`
  );

  // Ensure medications columns
  const medCols: Record<string, string> = {
    frequency: "TEXT NOT NULL DEFAULT 'once_daily'",
    timing: "TEXT[] NOT NULL DEFAULT '{\"08:00\"}'",
    instructions: 'TEXT',
    active: 'BOOLEAN DEFAULT true',
  };
  for (const [col, def] of Object.entries(medCols)) {
    await runDDL(
      `Ensured medications.${col}`,
      `ALTER TABLE medications ADD COLUMN IF NOT EXISTS ${col} ${def};`
    );
  }

  // Ensure ehr_uploads columns
  const ehrCols: Record<string, string> = {
    file_name: "TEXT NOT NULL DEFAULT 'unknown'",
    raw_text: "TEXT NOT NULL DEFAULT ''",
    parsed_data: 'JSONB',
    uploaded_by: 'UUID REFERENCES users(id)',
  };
  for (const [col, def] of Object.entries(ehrCols)) {
    await runDDL(
      `Ensured ehr_uploads.${col}`,
      `ALTER TABLE ehr_uploads ADD COLUMN IF NOT EXISTS ${col} ${def};`
    );
  }

  // Notify PostgREST to reload schema cache after any DDL
  if (ddlRan) {
    const { error } = await supabase.rpc('exec_sql', { query: "NOTIFY pgrst, 'reload schema';" });
    if (!error) logger.info('PostgREST schema cache reload triggered');
  }

  logger.info('Schema check complete');
}

const app = express();
const httpServer = createServer(app);

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const io = new Server(httpServer, {
  cors: { origin: frontendOrigin },
});
setIO(io);

io.on('connection', (socket) => {
  logger.info('Client connected', { id: socket.id });
  socket.on('subscribe', (userId: string) => {
    if (userId) socket.join(`user:${userId}`);
  });
  socket.on('disconnect', () => logger.info('Client disconnected', { id: socket.id }));
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, async () => {
  logger.info(`CAREHIVE API + WebSocket on port ${PORT}`);
  await ensureSchema();
});
