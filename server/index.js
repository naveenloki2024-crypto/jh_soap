// JH Soaps API — Express + MongoDB Atlas entry point.
import { safeErrorMessage } from './lib/safe-log.js';

async function start() {
  let env;
  let app;
  let connectDatabase;
  let disconnectDatabase;

  try {
    ({ default: env } = await import('./config/env.js'));
    ({ connectDatabase, disconnectDatabase } = await import('./config/database.js'));
    ({ default: app } = await import('./app.js'));
  } catch (error) {
    console.error('\n[startup] Failed to start the JH Soap API:');
    console.error(`  ${safeErrorMessage(error)}`);
    console.error('\nCheck .env against .env.example (MONGODB_URI and JWT_SECRET are required).\n');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`JH Soap API listening on http://localhost:${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    if (env.CORS_ORIGIN === '*') {
      console.log('CORS: allowing all origins (set CORS_ORIGIN to restrict).');
    }
  });

  server.on('error', (error) => {
    console.error(`[startup] Could not listen on port ${env.PORT}: ${safeErrorMessage(error)}`);
    process.exit(1);
  });

  let shuttingDown = false;
  let retryTimer = null;

  const RETRY_BASE_MS = 2000;
  const RETRY_MAX_MS = 30000;

  const wait = (ms) =>
    new Promise((resolve) => {
      retryTimer = setTimeout(resolve, ms);
    });

  async function connectWithRetry() {
    let attempt = 0;
    let delay = RETRY_BASE_MS;

    while (!shuttingDown) {
      attempt += 1;
      try {
        await connectDatabase();
        console.log(`[database] connected on attempt ${attempt}; API is ready.`);
        return;
      } catch {
        if (shuttingDown) return;
        const jitter = Math.floor(Math.random() * 1000);
        const waitMs = Math.min(delay + jitter, RETRY_MAX_MS);
        console.warn(
          `[database] attempt ${attempt} failed; retrying in ${(waitMs / 1000).toFixed(1)}s.`,
        );
        await wait(waitMs);
        delay = Math.min(delay * 2, RETRY_MAX_MS);
      }
    }
  }

  // Keep the API online even if Atlas is temporarily unreachable. Requests that
  // need the database return a 503 DATABASE_UNAVAILABLE error, and the server
  // reconnects automatically once Atlas accepts the connection again.
  connectWithRetry();

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (retryTimer) clearTimeout(retryTimer);
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
