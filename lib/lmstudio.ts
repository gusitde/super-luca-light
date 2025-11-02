export type ChatMessage = { role: 'system'|'user'|'assistant'; content: string };

export async function lmStudioChat(
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ model, messages, temperature, stream: false })
  });
  if (!res.ok) throw new Error(`LM Studio chat failed: ${res.status}`);
  const json = await res.json();
  const text =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    '';
  return text;
}
