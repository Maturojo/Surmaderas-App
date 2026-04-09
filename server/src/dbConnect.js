import mongoose from "mongoose";

let connectionPromise = null;

export async function ensureDbConnection() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta MONGODB_URI en la configuracion del server");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    await connectionPromise;
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}
