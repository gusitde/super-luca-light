import Upload from "./components/Upload";

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
        <p className="text-slate-600">
          Configure your assistant&apos;s persona, tone, and preferences. Upload background documents to
          enrich its memory.
        </p>
      </div>

      <Upload />
    </section>
  );
}
