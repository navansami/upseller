import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get("upseller_session")?.value;
  if (!token) return null;
  const database = await db();
  const session = await database
    .collection("sessions")
    .findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await database
    .collection("users")
    .findOne({ _id: session.userId, deletedAt: null });
  return user
    ? {
        id: user._id.toString(),
        email: user.email as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
        role: user.role === "admin" ? ("admin" as const) : ("user" as const),
      }
    : null;
}
export async function createSession(
  userId: import("mongodb").ObjectId,
  remember: boolean,
) {
  const token = randomBytes(32).toString("hex");
  const seconds = remember ? 60 * 60 * 24 * 365 : 60 * 60 * 24;
  await (await db()).collection("sessions").insertOne({
    userId,
    tokenHash: digest(token),
    expiresAt: new Date(Date.now() + seconds * 1000),
  });
  (await cookies()).set("upseller_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: seconds } : {}),
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  const valid =
    origin &&
    (expected
      ? origin === new URL(expected).origin
      : new URL(origin).host === request.headers.get("host"));
  if (!valid) throw new Error("Invalid request origin");
}
