# Smoke Test Checklist

Use this checklist to verify core functionality on a fresh Windows laptop with LM Studio and Ollama running.

- [ ] **/admin settings sync**
  - Save settings on `/admin`.
  - Confirm the app successfully pings both LM Studio and Ollama.
- [ ] **/persona form**
  - Open `/persona` and enter a name, job description, and memory prompt.
  - Save and confirm each field persists after refreshing.
- [ ] **Document upload and search**
  - Upload a `.txt` file containing a known phrase.
  - Use `/api/search` to locate that phrase in the uploaded document.
- [ ] **RAG conversation indicator**
  - Start a new conversation.
  - Send a question that includes words from the uploaded `.txt` file.
  - Verify the UI indicates "RAG used" for the response.
- [ ] **Hold to Talk**
  - Press and hold the talk control, speak a question, and release.
  - Ensure the transcript appears in the input and is sent automatically.
  - Confirm an answer is returned.
- [ ] **Speak Reply**
  - Trigger the Speak Reply feature for a response.
  - Verify that text-to-speech audio plays back the answer.

All items must pass for the deployment to be considered smoke-tested.
