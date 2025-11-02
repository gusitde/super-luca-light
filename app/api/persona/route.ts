import { NextResponse } from "next/server";

type PersonaPayload = {
  name?: string;
  description?: string;
  goals?: string[];
};

export async function GET() {
  return NextResponse.json({
    message: "Persona endpoint is ready",
    persona: {
      name: "Default Assistant",
      description: "Friendly and helpful.",
      goals: ["Assist users", "Answer questions", "Summarize documents"]
    }
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as PersonaPayload;
  return NextResponse.json({
    message: "Persona stored (mock)",
    persona: payload
  });
}
