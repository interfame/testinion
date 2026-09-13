// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}