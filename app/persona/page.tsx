import Upload from "./components/Upload";

export default function PersonaPage() {
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
