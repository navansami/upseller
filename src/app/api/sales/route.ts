import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrigin, currentUser } from "@/lib/auth";
import { packages, saleRevenue } from "@/lib/types";
export const runtime = "nodejs";
const schema = z
  .object({
    guestName: z.string().trim().min(1).max(100),
    confirmation: z.string().trim().min(1).max(50),
    room: z.string().trim().min(1).max(20),
    package: z.enum(packages),
    amount: z
      .number()
      .positive()
      .max(10000000)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
        "Use at most two decimal places.",
      ),
    nights: z.number().int().min(1).max(365),
    soldAt: z.iso
      .datetime()
      .refine(
        (d) => new Date(d).getTime() <= Date.now() + 60000,
        "Sale date cannot be in the future.",
      ),
    opera: z.enum(["pending", "self", "other"]),
    updatedBy: z.string().trim().max(100),
    notes: z.string().trim().max(2000),
  })
  .refine((d) => d.opera !== "other" || d.updatedBy.length > 0, {
    message: "Enter the name of the person who updated Opera.",
  });
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const sales = await (
      await db()
    )
      .collection("sales")
      .find({ userId: new ObjectId(user.id) })
      .sort({ soldAt: -1 })
      .toArray();
    return NextResponse.json({
      sales: sales.map(({ _id, userId, ...sale }) => ({
        ...sale,
        totalRevenue: saleRevenue({ amount: sale.amount, nights: sale.nights }),
        id: _id.toString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load your sales." },
      { status: 503 },
    );
  }
}
async function mutate(request: Request, method: "POST" | "PATCH" | "DELETE") {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const body = await request.json();
    const collection = (await db()).collection("sales");
    const filter = {
      _id:
        body.id && ObjectId.isValid(body.id)
          ? new ObjectId(body.id)
          : new ObjectId(),
      userId: new ObjectId(user.id),
    };
    if (method === "DELETE") {
      const result = await collection.deleteOne(filter);
      return NextResponse.json(
        { ok: !!result.deletedCount },
        { status: result.deletedCount ? 200 : 404 },
      );
    }
    const data = schema.parse(body);
    const now = new Date().toISOString();
    const sale = {
      ...data,
      totalRevenue: saleRevenue(data),
      updatedBy:
        data.opera === "self"
          ? `${user.firstName} ${user.lastName}`
          : data.opera === "other"
            ? data.updatedBy
            : "",
      updatedAt: now,
    };
    if (method === "PATCH") {
      const result = await collection.updateOne(filter, { $set: sale });
      if (!result.matchedCount)
        return NextResponse.json({ error: "Sale not found." }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    await collection.insertOne({
      ...sale,
      userId: new ObjectId(user.id),
      createdAt: now,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Invalid request origin")
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues[0].message
            : "Unable to save changes. Please try again.",
      },
      { status: e instanceof z.ZodError ? 400 : 500 },
    );
  }
}
export const POST = (r: Request) => mutate(r, "POST");
export const PATCH = (r: Request) => mutate(r, "PATCH");
export const DELETE = (r: Request) => mutate(r, "DELETE");
