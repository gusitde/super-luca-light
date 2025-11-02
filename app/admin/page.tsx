import { getSettings } from "@/lib/db";

export default function AdminPage() {
  const settings = getSettings();

  const diagnostics: Array<{ label: string; value: string }> = [
    { label: "Text model", value: settings.modelText?.trim() || "Not configured" },
    { label: "Embedding model", value: settings.modelEmbed?.trim() || "Not configured" },
    { label: "LM Studio", value: settings.lmstudioBaseUrl?.trim() || "Not configured" },
    { label: "Ollama", value: settings.ollamaBaseUrl?.trim() || "Not configured" },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="text-slate-600">
          Placeholder admin dashboard. Wire up your settings, usage metrics, or management tools here.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Diagnostics</h2>
        <p className="text-sm text-slate-600">
          Quick glance at the configured models and base URLs.
        </p>
        <ul className="flex flex-wrap gap-2">
          {diagnostics.map((item) => (
            <li
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              <span className="font-medium text-slate-500">{item.label}</span>
              <span className="text-slate-900">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
