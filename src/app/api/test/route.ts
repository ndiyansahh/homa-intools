import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      message: 'API is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}