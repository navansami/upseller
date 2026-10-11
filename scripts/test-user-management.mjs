// Runs against an isolated database; never mutates the configured application database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

if (!process.env.MONGODB_URI)
  throw new Error("Configure MONGODB_URI before running integration tests.");
const databaseName = `upseller_test_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
const origin = "http://127.0.0.1:3101";
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
});
let server;
try {
  await client.connect();
  const database = client.db(databaseName);
  const users = database.collection("users");
  const password = randomUUID();
  await users.insertOne({
    email: "admin@example.test",
    firstName: "Test",
    lastName: "Admin",
    role: "admin",
    deletedAt: null,
    passwordHash: await bcrypt.hash(password, 4),
    createdAt: new Date(),
  });
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--port",
      "3101",
      "--hostname",
      "127.0.0.1",
    ],
    {
      env: {
        ...process.env,
        MONGODB_DB: databaseName,
        APP_ORIGIN: origin,
        NODE_ENV: "production",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null)
      throw new Error("Test server failed to start.");
    try {
      const r = await fetch(`${origin}/api/auth`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(250);
  }
  assert(ready, "Test server must start");
  async function call(path, method = "GET", body, cookie) {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: {
        origin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const adminLogin = await call("/api/auth", "POST", {
    email: "admin@example.test",
    password,
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, "admin");
  const adminCookie = adminLogin.cookie;
  const regular = await call("/api/auth", "POST", {
    email: "regular@example.test",
    firstName: "Regular",
    lastName: "User",
    password,
    role: "admin",
  });
  assert.equal(regular.status, 200);
  assert.equal(
    regular.body.user.role,
    "user",
    "Public registration cannot grant admin",
  );
  const userCookie = regular.cookie;
  const saleInput = {
    guestName: "Calculation Test",
    confirmation: "CALC-001",
    room: "501",
    package: "Breakfast",
    amount: 100,
    nights: 5,
    soldAt: new Date().toISOString(),
    opera: "pending",
    updatedBy: "",
    notes: "",
  };
  assert.equal(
    (
      await call(
        "/api/sales",
        "POST",
        { ...saleInput, totalRevenue: 1 },
        userCookie,
      )
    ).status,
    201,
  );
  const saleOwner = new ObjectId(regular.body.user.id);
  const savedSale = await database
    .collection("sales")
    .findOne({ userId: saleOwner });
  assert.equal(
    savedSale.amount,
    100,
    "The input is stored as the nightly value",
  );
  assert.equal(
    savedSale.totalRevenue,
    500,
    "The server computes the total and ignores supplied totals",
  );
  assert.equal(
    (await call("/api/sales", "GET", undefined, userCookie)).body.sales[0]
      .totalRevenue,
    500,
  );
  assert.equal(
    (
      await call(
        "/api/sales",
        "PATCH",
        {
          ...saleInput,
          id: savedSale._id.toString(),
          amount: 100.15,
          nights: 2,
        },
        userCookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await database.collection("sales").findOne({ _id: savedSale._id }))
      .totalRevenue,
    200.3,
    "Edits recalculate with currency precision",
  );
  const legacy = await database
    .collection("sales")
    .insertOne({ ...saleInput, userId: saleOwner });
  const records = (await call("/api/sales", "GET", undefined, userCookie)).body
    .sales;
  assert.equal(
    records.find((s) => s.id === legacy.insertedId.toString()).totalRevenue,
    500,
    "Existing records calculate totals without a migration",
  );
  console.log(
    "PASS: nightly value × nights, server-computed totals, decimal precision, edit recalculation, and existing records.",
  );
  if (!process.argv.includes("--sales-only")) {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      assert.equal(
        (
          await call(
            "/api/users",
            method,
            method === "GET" ? undefined : {},
            userCookie,
          )
        ).status,
        403,
        `Regular user blocked from ${method}`,
      );
      assert.equal(
        (await call("/api/users", method, method === "GET" ? undefined : {}))
          .status,
        401,
        `Anonymous caller blocked from ${method}`,
      );
    }
    const form = {
      email: "colleague@example.test",
      firstName: "Colleague",
      lastName: "Example",
      role: "user",
    };
    assert.equal(
      (await call("/api/users", "POST", form, adminCookie)).status,
      201,
    );
    assert.equal(
      (await call("/api/users", "POST", form, adminCookie)).status,
      409,
      "Duplicate email refused",
    );
    const colleague = await users.findOne({ email: form.email });
    const setup = await call("/api/auth", "POST", {
      action: "check",
      email: form.email,
    });
    assert.equal(setup.body.needsPassword, true);
    assert.equal(setup.body.firstName, "Colleague");
    const colleagueLogin = await call("/api/auth", "POST", {
      ...form,
      password,
      role: "admin",
    });
    assert.equal(
      colleagueLogin.body.user.role,
      "user",
      "Password setup preserves provisioned role",
    );
    const colleagueCookie = colleagueLogin.cookie;
    await database.collection("sales").insertOne({
      userId: colleague._id,
      guestName: "Retained history",
      amount: 150,
    });
    assert.equal(
      (
        await call(
          "/api/users",
          "PATCH",
          {
            ...form,
            id: colleague._id.toString(),
            firstName: "Updated",
            role: "admin",
          },
          adminCookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (await call("/api/auth", "GET", undefined, colleagueCookie)).body.user
        .role,
      "admin",
      "Role is read from the database each request",
    );
    assert.equal(
      (
        await call(
          "/api/users",
          "PATCH",
          {
            ...form,
            id: colleague._id.toString(),
            firstName: "Updated",
            role: "user",
          },
          adminCookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (await call("/api/users", "GET", undefined, colleagueCookie)).status,
      403,
      "Demotion affects existing session",
    );
    const adminId = adminLogin.body.user.id;
    assert.equal(
      (await call("/api/users", "DELETE", { id: adminId }, adminCookie)).status,
      400,
      "Self-delete blocked",
    );
    assert.equal(
      (
        await call(
          "/api/users",
          "PATCH",
          {
            email: "admin@example.test",
            firstName: "Test",
            lastName: "Admin",
            id: adminId,
            role: "user",
          },
          adminCookie,
        )
      ).status,
      400,
      "Self-demotion blocked",
    );
    assert.equal(
      (
        await call(
          "/api/users",
          "DELETE",
          { id: colleague._id.toString() },
          adminCookie,
        )
      ).status,
      200,
    );
    const deleted = await users.findOne({ _id: colleague._id });
    assert(deleted.deletedAt instanceof Date, "User is soft-deleted");
    assert(deleted.deletedBy, "Deletion actor retained");
    assert.equal(
      await database
        .collection("sales")
        .countDocuments({ userId: colleague._id }),
      1,
      "Sale history retained",
    );
    assert.equal(
      await database
        .collection("sessions")
        .countDocuments({ userId: colleague._id }),
      0,
      "Sessions revoked",
    );
    assert.equal(
      (await call("/api/auth", "GET", undefined, colleagueCookie)).body.user,
      null,
    );
    assert.equal(
      (await call("/api/auth", "POST", { email: form.email, password })).status,
      403,
      "Deleted login blocked",
    );
    assert.equal(
      (await call("/api/auth", "POST", { ...form, password })).status,
      403,
      "Deleted re-registration blocked",
    );
    assert.equal(
      (await call("/api/users", "POST", form, adminCookie)).status,
      409,
      "Deleted email reserved",
    );
    const list = await call("/api/users", "GET", undefined, adminCookie);
    assert.equal(list.status, 200);
    assert(
      list.body.users.find((u) => u.id === colleague._id.toString()).deletedAt,
    );
    assert(
      list.body.users.every((u) => !("passwordHash" in u)),
      "Password hashes never returned",
    );
    console.log(
      "PASS: admin CRUD, role enforcement, first-password setup, self-protection, soft deletion, session revocation, retained history, and email uniqueness.",
    );
  }
} catch (error) {
  console.error(
    `Integration test failed: ${error.name}: ${error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]")}`,
  );
  process.exitCode = 1;
} finally {
  if (server) {
    server.kill();
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(3000),
    ]);
  }
  // Only the uniquely named database created by this invocation can be removed.
  if (/^upseller_test_[a-f0-9]{24}$/.test(databaseName))
    await client.db(databaseName).dropDatabase();
  await client.close();
}
