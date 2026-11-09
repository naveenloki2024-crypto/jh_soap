import mongoose from 'mongoose';
import env from '../config/env.js';
import Product from '../models/Product.js';

export async function checkDatabase() {
  const startedAt = Date.now();
  const configured = Boolean(env.MONGODB_URI);
  const connected = mongoose.connection.readyState === 1;
  const result = {
    configured,
    connected,
    database: mongoose.connection.name || env.DB_NAME,
    collectionReady: false,
    latencyMs: null,
    message: '',
  };

  if (!connected) {
    result.message = 'MongoDB is not connected.';
    return result;
  }

  try {
    await mongoose.connection.db.admin().ping();
    await Product.exists({});
    result.collectionReady = true;
    result.latencyMs = Date.now() - startedAt;
    result.message = 'MongoDB is reachable.';
  } catch {
    result.message = 'MongoDB ping failed.';
  }

  return result;
}
