import { MongoClient } from "mongodb";
const globalDb = globalThis as unknown as { mongo?: Promise<MongoClient> };
export async function db() {
  if (!process.env.MONGODB_URI)
    throw new Error(
      "Database is not configured. Add MONGODB_URI to .env.local to enable accounts.",
    );
  if (!globalDb.mongo)
    globalDb.mongo = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    })
      .connect()
      .catch((e) => {
        globalDb.mongo = undefined;
        throw e;
      });
  const database = (await globalDb.mongo).db(
    process.env.MONGODB_DB || "upseller",
  );
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("sales").createIndex({ userId: 1, soldAt: -1 }),
    database
      .collection("attempts")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return database;
}
