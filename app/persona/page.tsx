"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Persona = {
  name: string;
  jobDescription: string;
  memoryPrompt: string;
  temperature: number;
};

type PersonaResponse = {
  persona: Persona;
  errors?: string[];
  error?: string;
};

const INPUT_BASE_CLASS =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function PersonaPage() {
  const [formState, setFormState] = useState({
    name: "",
    jobDescription: "",
    memoryPrompt: "",
    temperature: "0.7",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPersona() {
      try {
        const response = await fetch("/api/persona", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load persona (${response.status})`);
        }
        const data = (await response.json()) as PersonaResponse;
        if (!data?.persona) {
          throw new Error("Persona payload missing.");
        }

        if (!cancelled) {
          const { persona } = data;
          setFormState({
            name: persona.name ?? "",
            jobDescription: persona.jobDescription ?? "",
            memoryPrompt: persona.memoryPrompt ?? "",
            temperature:
              typeof persona.temperature === "number"
                ? String(persona.temperature)
                : "0.7",
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load persona.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPersona();

    return () => {
      cancelled = true;
    };
  }, []);

  const temperatureHelp = useMemo(() => {
    const value = Number.parseFloat(formState.temperature);
    if (!Number.isFinite(value)) {
      return "Temperature controls randomness. Enter a value between 0 and 1.";
    }
    if (value < 0) {
      return "Temperature cannot be negative.";
    }
    if (value > 1) {
      return "Temperature cannot exceed 1.";
    }
    return "Lower values make responses more focused; higher values increase creativity.";
  }, [formState.temperature]);

  function handleInputChange(field: "name" | "jobDescription" | "memoryPrompt" | "temperature") {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormState((current) => ({
        ...current,
        [field]: value,
      }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const parsedTemperature = Number.parseFloat(formState.temperature);
    if (!Number.isFinite(parsedTemperature)) {
      setError("Temperature must be a number between 0 and 1.");
      return;
    }
    if (parsedTemperature < 0 || parsedTemperature > 1) {
      setError("Temperature must be between 0 and 1.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/persona", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          jobDescription: formState.jobDescription,
          memoryPrompt: formState.memoryPrompt,
          temperature: parsedTemperature,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as PersonaResponse;

      if (!response.ok) {
        const errorMessage = data?.errors?.join(" ") || data?.error || "Failed to save persona.";
        throw new Error(errorMessage);
      }

      if (!data?.persona) {
        throw new Error("Unexpected response from server.");
      }

      setFormState({
        name: data.persona.name ?? "",
        jobDescription: data.persona.jobDescription ?? "",
        memoryPrompt: data.persona.memoryPrompt ?? "",
        temperature:
          typeof data.persona.temperature === "number"
            ? String(data.persona.temperature)
            : formState.temperature,
      });
      setSuccess("Persona saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save persona.");
    } finally {
      setIsSaving(false);
    }
  }

  const isSubmitDisabled = isSaving || isLoading;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Persona</h1>
        <p className="text-sm text-slate-600">
          Customize your assistant&apos;s identity, communication style, and guiding memory prompts.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading persona…</div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,320px)]">
            <label className="space-y-1" htmlFor="persona-name">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                id="persona-name"
                name="name"
                className={INPUT_BASE_CLASS}
                placeholder="e.g. Research Assistant"
                value={formState.name}
                onChange={handleInputChange("name")}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1" htmlFor="persona-job">
              <span className="text-sm font-medium text-slate-700">Job Description</span>
              <textarea
                id="persona-job"
                name="jobDescription"
                className={`${INPUT_BASE_CLASS} min-h-[200px] resize-vertical`}
                placeholder="Describe responsibilities, domain expertise, and tone."
                value={formState.jobDescription}
                onChange={handleInputChange("jobDescription")}
              />
            </label>

            <label className="space-y-1" htmlFor="persona-memory">
              <span className="text-sm font-medium text-slate-700">Memory Prompt</span>
              <textarea
                id="persona-memory"
                name="memoryPrompt"
                className={`${INPUT_BASE_CLASS} min-h-[200px] resize-vertical`}
                placeholder="Outline persistent memories, context, or constraints for the assistant."
                value={formState.memoryPrompt}
                onChange={handleInputChange("memoryPrompt")}
              />
            </label>
          </div>

          <div className="max-w-xs space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="persona-temperature">
              Temperature
            </label>
            <input
              id="persona-temperature"
              name="temperature"
              type="number"
              min={0}
              max={1}
              step={0.05}
              className={INPUT_BASE_CLASS}
              value={formState.temperature}
              onChange={handleInputChange("temperature")}
              required
            />
            <p className="text-xs text-slate-500">{temperatureHelp}</p>
          </div>

          <div>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={isSubmitDisabled}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
