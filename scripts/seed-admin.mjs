import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  console.error(
    "MONGODB_URI is missing. Configure .env.local before running npm run seed:admin.",
  );
  process.exit(1);
}
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
});
try {
  await client.connect();
  const database = client.db(process.env.MONGODB_DB || "upseller");
  const users = database.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  await users.updateMany(
    { role: { $exists: false } },
    { $set: { role: "user" } },
  );
  const email = "navan.sami@fairmont.com";
  await users.updateOne(
    { email },
    {
      $set: {
        firstName: "Navan",
        lastName: "Sami",
        role: "admin",
        deletedAt: null,
        updatedAt: new Date(),
      },
      $setOnInsert: { email, createdAt: new Date() },
      $unset: { deletedBy: "" },
    },
    { upsert: true },
  );
  const user = await users.findOne(
    { email },
    {
      projection: {
        email: 1,
        firstName: 1,
        lastName: 1,
        role: 1,
        deletedAt: 1,
        passwordHash: 1,
      },
    },
  );
  console.log(
    JSON.stringify(
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        active: !user.deletedAt,
        passwordSetupRequired: !user.passwordHash,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    `Admin seed failed (${error.name}). Check Atlas connectivity, database credentials, and network access.`,
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
