import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    ok: true,
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    message: "Chatterly API is running!" 
  });
}
