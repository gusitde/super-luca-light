import { NextResponse } from "next/server";
import { getPersona, savePersona } from "@/lib/db";

interface PersonaPayload {
  name?: unknown;
  jobDescription?: unknown;
  memoryPrompt?: unknown;
  temperature?: unknown;
}

function validatePayload(payload: PersonaPayload) {
  const errors: string[] = [];
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const jobDescription =
    payload.jobDescription === undefined
      ? ""
      : typeof payload.jobDescription === "string"
        ? payload.jobDescription
        : null;
  const memoryPrompt =
    payload.memoryPrompt === undefined
      ? ""
      : typeof payload.memoryPrompt === "string"
        ? payload.memoryPrompt
        : null;
  const temperatureValue =
    typeof payload.temperature === "number"
      ? payload.temperature
      : typeof payload.temperature === "string"
        ? Number.parseFloat(payload.temperature)
        : Number.NaN;

  if (!name) {
    errors.push("Name is required.");
  }

  if (jobDescription === null) {
    errors.push("Job description must be a string.");
  }

  if (memoryPrompt === null) {
    errors.push("Memory prompt must be a string.");
  }

  if (!Number.isFinite(temperatureValue)) {
    errors.push("Temperature must be a number.");
  } else if (temperatureValue < 0 || temperatureValue > 1) {
    errors.push("Temperature must be between 0 and 1.");
  }

  return {
    errors,
    data: {
      name,
      jobDescription: jobDescription ?? "",
      memoryPrompt: memoryPrompt ?? "",
      temperature: Number.isFinite(temperatureValue) ? temperatureValue : 0,
    },
  } as const;
}

export async function GET() {
  const persona = getPersona();
  return NextResponse.json({ persona });
}

export async function PUT(request: Request) {
  let payload: PersonaPayload;

  try {
    payload = (await request.json()) as PersonaPayload;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Payload must be a JSON object." },
      { status: 400 },
    );
  }

  const { errors, data } = validatePayload(payload);

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const persona = savePersona(data);
  return NextResponse.json({ persona });
}
