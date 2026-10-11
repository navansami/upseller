import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { checkOrigin, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const fields = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  role: z.enum(["admin", "user"]),
});
const idSchema = z.string().refine(ObjectId.isValid, "Invalid user ID.");
export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    if (actor.role !== "admin")
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    const users = await (
      await db()
    )
      .collection("users")
      .find(
        {},
        {
          projection: {
            email: 1,
            firstName: 1,
            lastName: 1,
            role: 1,
            deletedAt: 1,
            createdAt: 1,
            passwordHash: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role === "admin" ? "admin" : "user",
        deletedAt: u.deletedAt || null,
        createdAt: u.createdAt || null,
        hasPassword: Boolean(u.passwordHash),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load users." },
      { status: 503 },
    );
  }
}
async function mutate(request: Request, method: "POST" | "PATCH" | "DELETE") {
  try {
    checkOrigin(request);
    const actor = await currentUser();
    if (!actor)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    if (actor.role !== "admin")
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    const body = await request.json();
    const database = await db();
    const users = database.collection("users");
    const now = new Date();
    if (method === "POST") {
      const data = fields.parse({ ...body, email: body.email?.trim() });
      await users.insertOne({
        ...data,
        createdAt: now,
        updatedAt: now,
        createdBy: new ObjectId(actor.id),
        deletedAt: null,
      });
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    const id = new ObjectId(idSchema.parse(body.id));
    if (method === "DELETE") {
      if (actor.id === id.toString())
        return NextResponse.json(
          { error: "You cannot delete your own account." },
          { status: 400 },
        );
      const result = await users.updateOne(
        { _id: id, deletedAt: null },
        {
          $set: {
            deletedAt: now,
            deletedBy: new ObjectId(actor.id),
            updatedAt: now,
          },
        },
      );
      if (!result.matchedCount)
        return NextResponse.json(
          { error: "Active user not found." },
          { status: 404 },
        );
      await database.collection("sessions").deleteMany({ userId: id });
      return NextResponse.json({ ok: true });
    }
    const data = fields.parse({ ...body, email: body.email?.trim() });
    if (actor.id === id.toString() && data.role !== "admin")
      return NextResponse.json(
        { error: "You cannot remove your own administrator access." },
        { status: 400 },
      );
    const result = await users.updateOne(
      { _id: id, deletedAt: null },
      { $set: { ...data, updatedAt: now, updatedBy: new ObjectId(actor.id) } },
    );
    if (!result.matchedCount)
      return NextResponse.json(
        { error: "Active user not found." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
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
        {
          error:
            "That email is already assigned to an account, including deleted accounts.",
        },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Unable to save user changes." },
      { status: 500 },
    );
  }
}
export const POST = (r: Request) => mutate(r, "POST");
export const PATCH = (r: Request) => mutate(r, "PATCH");
export const DELETE = (r: Request) => mutate(r, "DELETE");
