import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkOrigin, createSession, currentUser, digest } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json({
      user: await currentUser(),
      configured: Boolean(process.env.MONGODB_URI),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to connect to the database. Check your Atlas connection.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json();
    const email = z.email().max(254).parse(body.email?.trim().toLowerCase());
    const database = await db();
    const key = digest(`${email}:${Math.floor(Date.now() / 900000)}`);
    const attempt = await database
      .collection("attempts")
      .findOne({ key, expiresAt: { $gt: new Date() } });
    if ((attempt?.count || 0) >= 12)
      return NextResponse.json(
        { error: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 },
      );
    await database.collection("attempts").updateOne(
      { key },
      {
        $inc: { count: 1 },
        $set: {
          expiresAt:
            attempt?.expiresAt && attempt.expiresAt > new Date()
              ? attempt.expiresAt
              : new Date(Date.now() + 900000),
        },
      },
      { upsert: true },
    );
    const user = await database.collection("users").findOne({ email });
    if (user?.deletedAt)
      return NextResponse.json(
        { error: "This account is inactive. Please contact an administrator." },
        { status: 403 },
      );
    if (body.action === "check")
      return NextResponse.json({
        needsPassword: !user?.passwordHash,
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
      });
    const password = z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(72)
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password must fit within 72 UTF-8 bytes.",
      )
      .parse(body.password);
    if (user?.passwordHash) {
      if (!(await bcrypt.compare(password, user.passwordHash)))
        return NextResponse.json(
          { error: "Incorrect password. Please try again." },
          { status: 401 },
        );
      await createSession(user._id, body.remember !== false);
    } else {
      const firstName = z.string().trim().min(1).max(60).parse(body.firstName);
      const lastName = z.string().trim().min(1).max(60).parse(body.lastName);
      const passwordHash = await bcrypt.hash(password, 12);
      if (user) {
        const result = await database.collection("users").updateOne(
          {
            _id: user._id,
            deletedAt: null,
            passwordHash: { $exists: false },
          },
          {
            $set: {
              passwordHash,
              firstName,
              lastName,
              updatedAt: new Date(),
            },
          },
        );
        if (!result.modifiedCount)
          return NextResponse.json(
            { error: "Account has changed. Please sign in again." },
            { status: 409 },
          );
        await createSession(user._id, body.remember !== false);
      } else {
        const result = await database.collection("users").insertOne({
          email,
          firstName,
          lastName,
          passwordHash,
          role: "user",
          deletedAt: null,
          createdAt: new Date(),
        });
        await createSession(result.insertedId, body.remember !== false);
      }
    }
    await database.collection("attempts").deleteMany({ key });
    return NextResponse.json({ user: await currentUser() });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid request origin")
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    if ((error as { code?: number }).code === 11000)
      return NextResponse.json(
        { error: "Account already exists. Please sign in." },
        { status: 409 },
      );
    return NextResponse.json(
      {
        error: process.env.MONGODB_URI
          ? "Unable to sign in. Please try again."
          : "Connect MongoDB Atlas in .env.local to create your account. You can explore the demo now.",
      },
      { status: 503 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    const token = jar.get("upseller_session")?.value;
    if (token)
      await (
        await db()
      )
        .collection("sessions")
        .deleteMany({ tokenHash: digest(token) });
    jar.delete("upseller_session");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to sign out. Please retry." },
      { status: 500 },
    );
  }
}
