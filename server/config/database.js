import mongoose from 'mongoose';
import env from './env.js';
import { safeErrorMessage } from '../lib/safe-log.js';

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersAttached = false;
let connectPromise = null;
let closing = false;

function connectionErrorText(error) {
  const parts = [];
  const add = (value) => {
    if (value && typeof value === 'object' && typeof value.message === 'string') {
      parts.push(value.message);
    }
  };

  add(error);
  const topology = error?.reason || error?.cause;
  add(topology);

  if (topology?.servers instanceof Map) {
    for (const server of topology.servers.values()) add(server?.error);
  }

  return parts.join(' ');
}

function connectionHint(error) {
  const name = error?.name || '';
  const message = connectionErrorText(error);

  if (/not whitelisted|whitelist|IP that isn't|IP address/i.test(message)) {
    return 'The current public IP is not allowed by Atlas. Add it in Atlas > Network Access (or allow this environment) and retry.';
  }
  if (/ssl alert number 80|tlsv1 alert|ssl routines/i.test(message)) {
    return [
      'Atlas rejected the TLS handshake (SSL alert 80).',
      'Confirm Atlas > Network Access includes this network for BOTH IPv4 and IPv6 (use 0.0.0.0/0 and ::/0 for a development machine),',
      'the cluster is not paused, and the hotspot/VPN is not intercepting TLS.',
      'On IPv6/NAT64 mobile networks, retry or switch networks if the handshake keeps failing.',
    ].join(' ');
  }
  if (/certificate|CERT_|self signed|unable to verify/i.test(message)) {
    return 'TLS certificate validation failed. Check the system clock and whether a proxy/VPN is replacing Atlas certificates.';
  }
  if (
    name === 'MongoServerError' &&
    (error?.code === 18 || /auth|SCRAM|bad auth|credentials/i.test(message))
  ) {
    return 'MongoDB authentication failed. Verify the database user in MONGODB_URI and its Atlas permissions.';
  }
  if (/ENOTFOUND|EAI_AGAIN|ESERVFAIL|querySrv|queryTxt/i.test(message)) {
    return 'The MongoDB hostname could not be resolved. Check the cluster hostname, DNS, and proxy settings.';
  }
  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|timed out/i.test(message)) {
    return 'The MongoDB TCP connection failed. Check network/firewall/VPN access and the Atlas Network Access allowlist.';
  }
  if (/server selection|ServerSelection/i.test(message)) {
    return 'MongoDB did not select a healthy server before the timeout. Verify Atlas Network Access, cluster status, and network connectivity.';
  }
  return 'Verify MONGODB_URI, DB_NAME, Atlas database-user credentials, and Network Access.';
}

function serverErrorSummary(error) {
  const topology = error?.reason || error?.cause;
  if (!(topology?.servers instanceof Map)) return [];

  const lines = [];
  for (const [host, server] of topology.servers) {
    const detail = server?.error;
    if (!detail) continue;
    lines.push(`${host}: ${detail.name || 'Error'} - ${safeErrorMessage(detail)}`);
    if (lines.length === 3) break;
  }
  return lines;
}

function safeHost(uri) {
  try {
    return new URL(uri).hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (error) => {
    console.error(
      `[database] connection error: ${error?.name || 'DatabaseError'} - ${safeErrorMessage(error)}`,
    );
  });

  mongoose.connection.on('connected', () => {
    console.log(`[database] connected to "${mongoose.connection.name || env.DB_NAME}"`);
  });

  mongoose.connection.on('disconnected', () => {
    if (closing) {
      console.log('[database] disconnected');
      return;
    }
    console.warn('[database] disconnected; the driver will retry until Atlas is reachable.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[database] reconnected');
  });
}

/**
 * Connects Mongoose to Atlas (or any MongoDB deployment). The driver owns
 * reconnection; initial connection failures are surfaced to the caller.
 * Concurrent callers share the same in-flight connection attempt.
 */
export async function connectDatabase(options = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectPromise) return connectPromise;

  attachConnectionListeners();
  mongoose.set('strictQuery', true);
  closing = false;

  const uri = options.uri || env.MONGODB_URI;
  const dbName = options.dbName || env.DB_NAME;

  connectPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 20000,
        connectTimeoutMS: options.connectTimeoutMS ?? 20000,
        socketTimeoutMS: options.socketTimeoutMS ?? 0,
        maxPoolSize: options.maxPoolSize ?? 10,
        minPoolSize: options.minPoolSize ?? 0,
        // Node 20+ enables Happy Eyeballs by default. On mobile hotspots that
        // advertise NAT64/IPv6 addresses this can make Atlas abort the TLS
        // handshake (SSL alert 80); let the OS pick one address family instead.
        autoSelectFamily: options.autoSelectFamily ?? false,
      });
    } catch (error) {
      console.error(
        `[database] failed to connect to MongoDB host "${safeHost(uri)}" (database "${dbName}").`,
      );
      console.error(`[database] cause: ${safeErrorMessage(error)}`);

      const servers = serverErrorSummary(error);
      for (const line of servers) console.error(`[database] server: ${line}`);

      console.error(`[database] hint: ${connectionHint(error)}`);
      throw error;
    }

    return mongoose.connection;
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;
  closing = true;
  await mongoose.disconnect();
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export function databaseStatus() {
  return {
    state: READY_STATES[mongoose.connection.readyState] || 'unknown',
    connected: mongoose.connection.readyState === 1,
    database: mongoose.connection.name || env.DB_NAME,
  };
}

export default mongoose;
