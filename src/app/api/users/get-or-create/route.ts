import { NextResponse } from "next/server";
import { createOrFetchUser } from "@/lib/db/userOperations";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await createOrFetchUser(email, name);

    return NextResponse.json({ role: user.role }, { status: 200 });
  } catch (error) {
    console.error("Error in get-or-create user:", error);

    return NextResponse.json(
      { error: "Failed to create or fetch user" },
      { status: 500 }
    );
  }
}

// Optional: Reject non-POST
export function GET() {
  return NextResponse.json(
    { error: "Method GET Not Allowed" },
    { status: 405 }
  );
}
