import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { cosine } from './vector';

const DB_DIRECTORY = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIRECTORY, 'app.db');

if (!fs.existsSync(DB_DIRECTORY)) {
  fs.mkdirSync(DB_DIRECTORY, { recursive: true });
}

const db = new Database(DB_FILE);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

initializeSchema();
seedStaticRows();

export interface Settings {
  id: 1;
  openaiApiKey: string | null;
  ollamaBaseUrl: string | null;
  lmstudioBaseUrl: string | null;
  modelText: string | null;
  modelEmbed: string | null;
  sttModel: string | null;
  ttsModel: string | null;
  voice: string | null;
  ragTopK: number | null;
  chunkSize: number | null;
  chunkOverlap: number | null;
}

export type SettingsInput = Omit<Settings, 'id'>;

export interface Persona {
  id: 1;
  name: string;
  jobDescription: string;
  memoryPrompt: string;
  temperature: number;
}

export type PersonaInput = Omit<Persona, 'id'>;

export interface DocumentRecord {
  id: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export interface NewDocument {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt?: string;
}

export interface DocumentChunk {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  embedding: Float32Array;
}

export interface NewChunkInput {
  documentId: number;
  chunkIndex: number;
  content: string;
  embedding: Float32Array | number[];
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  usedRag: boolean;
  createdAt: string;
}

export interface NewMessageInput {
  conversationId: number;
  role: MessageRole;
  content: string;
  usedRag?: boolean;
  createdAt?: string;
}

export interface SearchResult {
  chunkId: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  score: number;
}

const getSettingsStmt = db.prepare<SettingsRow>(
  `SELECT id, openai_api_key, ollama_base_url, lmstudio_base_url, model_text, model_embed, stt_model, tts_model, voice, rag_top_k, chunk_size, chunk_overlap FROM settings WHERE id = 1`
);

const updateSettingsStmt = db.prepare(
  `UPDATE settings
   SET openai_api_key = @openai_api_key,
       ollama_base_url = @ollama_base_url,
       lmstudio_base_url = @lmstudio_base_url,
       model_text = @model_text,
       model_embed = @model_embed,
       stt_model = @stt_model,
       tts_model = @tts_model,
       voice = @voice,
       rag_top_k = @rag_top_k,
       chunk_size = @chunk_size,
       chunk_overlap = @chunk_overlap
   WHERE id = 1`
);

const getPersonaStmt = db.prepare<PersonaRow>(
  `SELECT id, name, job_description, memory_prompt, temperature FROM persona WHERE id = 1`
);

const updatePersonaStmt = db.prepare(
  `UPDATE persona
   SET name = @name,
       job_description = @job_description,
       memory_prompt = @memory_prompt,
       temperature = @temperature
   WHERE id = 1`
);

const insertDocumentStmt = db.prepare(
  `INSERT INTO documents (filename, mime_type, size_bytes, storage_path, created_at)
   VALUES (@filename, @mime_type, @size_bytes, @storage_path, @created_at)`
);

const listDocumentsStmt = db.prepare<DocumentRow>(
  `SELECT id, filename, mime_type, size_bytes, storage_path, created_at
   FROM documents
   ORDER BY datetime(created_at) DESC, id DESC`
);

const listDocumentsWithCountsStmt = db.prepare<DocumentWithChunkCountRow>(
  `SELECT d.id,
          d.filename,
          d.mime_type,
          d.size_bytes,
          d.storage_path,
          d.created_at,
          COUNT(c.id) AS chunk_count
     FROM documents AS d
     LEFT JOIN doc_chunks AS c ON c.document_id = d.id
    GROUP BY d.id
    ORDER BY datetime(d.created_at) DESC, d.id DESC`
);

const insertChunkStmt = db.prepare(
  `INSERT INTO doc_chunks (document_id, chunk_index, content, embedding)
   VALUES (@document_id, @chunk_index, @content, @embedding)`
);

const listConversationsStmt = db.prepare<ConversationRow>(
  `SELECT id, title, created_at, updated_at
   FROM conversations
   ORDER BY datetime(updated_at) DESC, id DESC`
);

const getConversationStmt = db.prepare<ConversationRow>(
  `SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?`
);

const insertConversationStmt = db.prepare(
  `INSERT INTO conversations (title, created_at, updated_at)
   VALUES (@title, @created_at, @updated_at)`
);

const insertMessageStmt = db.prepare(
  `INSERT INTO messages (conversation_id, role, content, used_rag, created_at)
   VALUES (@conversation_id, @role, @content, @used_rag, @created_at)`
);

const updateConversationTimestampStmt = db.prepare(
  `UPDATE conversations SET updated_at = @updated_at WHERE id = @id`
);

const listMessagesStmt = db.prepare<MessageRow>(
  `SELECT id, conversation_id, role, content, used_rag, created_at
   FROM messages
   WHERE conversation_id = ?
   ORDER BY datetime(created_at) ASC, id ASC`
);

const listChunksForSearchStmt = db.prepare<DocChunkRow>(
  `SELECT id, document_id, chunk_index, content, embedding FROM doc_chunks`
);

export function getSettings(): Settings {
  const row = getSettingsStmt.get();
  if (!row) {
    throw new Error('Settings row is missing. Initialization may have failed.');
  }

  return mapSettingsRow(row);
}

export function saveSettings(input: SettingsInput): Settings {
  updateSettingsStmt.run({
    openai_api_key: input.openaiApiKey ?? null,
    ollama_base_url: input.ollamaBaseUrl ?? null,
    lmstudio_base_url: input.lmstudioBaseUrl ?? null,
    model_text: input.modelText ?? null,
    model_embed: input.modelEmbed ?? null,
    stt_model: input.sttModel ?? null,
    tts_model: input.ttsModel ?? null,
    voice: input.voice ?? null,
    rag_top_k: input.ragTopK ?? null,
    chunk_size: input.chunkSize ?? null,
    chunk_overlap: input.chunkOverlap ?? null,
  });

  return getSettings();
}

export function getPersona(): Persona {
  const row = getPersonaStmt.get();
  if (!row) {
    throw new Error('Persona row is missing. Initialization may have failed.');
  }

  return mapPersonaRow(row);
}

export function savePersona(input: PersonaInput): Persona {
  updatePersonaStmt.run({
    name: input.name,
    job_description: input.jobDescription,
    memory_prompt: input.memoryPrompt,
    temperature: input.temperature,
  });

  return getPersona();
}

export function addDocument(input: NewDocument): DocumentRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const result = insertDocumentStmt.run({
    filename: input.filename,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    storage_path: input.storagePath,
    created_at: createdAt,
  });

  return {
    id: Number(result.lastInsertRowid),
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storagePath: input.storagePath,
    createdAt,
  };
}

export function addChunks(chunks: NewChunkInput[]): DocumentChunk[] {
  if (chunks.length === 0) {
    return [];
  }

  const transaction = db.transaction((rows: NewChunkInput[]) => {
    return rows.map((row) => {
      const embeddingArray = toFloat32Array(row.embedding);
      const result = insertChunkStmt.run({
        document_id: row.documentId,
        chunk_index: row.chunkIndex,
        content: row.content,
        embedding: serializeEmbedding(embeddingArray),
      });

      return {
        id: Number(result.lastInsertRowid),
        documentId: row.documentId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        embedding: new Float32Array(embeddingArray),
      } satisfies DocumentChunk;
    });
  });

  return transaction(chunks);
}

export function listDocuments(): DocumentRecord[] {
  const rows = listDocumentsStmt.all();
  return rows.map(mapDocumentRow);
}

export interface DocumentWithChunkCount extends DocumentRecord {
  chunkCount: number;
}

export function listDocumentsWithChunkCounts(): DocumentWithChunkCount[] {
  const rows = listDocumentsWithCountsStmt.all();
  return rows.map((row) => ({
    ...mapDocumentRow(row),
    chunkCount: row.chunk_count,
  }));
}

export function newConversation(title?: string): Conversation {
  const now = new Date().toISOString();
  const normalizedTitle = title?.trim().length ? title.trim() : 'New Conversation';
  const result = insertConversationStmt.run({
    title: normalizedTitle,
    created_at: now,
    updated_at: now,
  });

  return {
    id: Number(result.lastInsertRowid),
    title: normalizedTitle,
    createdAt: now,
    updatedAt: now,
  } satisfies Conversation;
}

export function listConversations(): Conversation[] {
  const rows = listConversationsStmt.all();
  return rows.map(mapConversationRow);
}

export function getConversation(id: number): Conversation | null {
  const row = getConversationStmt.get(id);
  return row ? mapConversationRow(row) : null;
}

export function addMessage(input: NewMessageInput): Message {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const result = insertMessageStmt.run({
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
    used_rag: input.usedRag ? 1 : 0,
    created_at: createdAt,
  });

  updateConversationTimestampStmt.run({
    updated_at: createdAt,
    id: input.conversationId,
  });

  return {
    id: Number(result.lastInsertRowid),
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    usedRag: Boolean(input.usedRag),
    createdAt,
  } satisfies Message;
}

export function listMessages(conversationId: number): Message[] {
  const rows = listMessagesStmt.all(conversationId);
  return rows.map(mapMessageRow);
}

export function searchTopK(queryEmbedding: Float32Array | number[], k: number): SearchResult[] {
  const limit = Math.max(0, Math.floor(k));
  if (limit === 0) {
    return [];
  }

  const queryVector = toFloat32Array(queryEmbedding);
  let queryMagnitude = 0;
  for (let i = 0; i < queryVector.length; i += 1) {
    const value = queryVector[i];
    queryMagnitude += value * value;
  }

  if (queryMagnitude === 0) {
    return [];
  }

  const rows = listChunksForSearchStmt.all();
  const scored = rows.map((row) => {
    const vector = deserializeEmbedding(row.embedding);
    const similarity = cosine(queryVector, vector);
    return {
      chunkId: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      score: similarity,
    } satisfies SearchResult;
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function initializeSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      openai_api_key TEXT,
      ollama_base_url TEXT,
      lmstudio_base_url TEXT,
      model_text TEXT,
      model_embed TEXT,
      stt_model TEXT,
      tts_model TEXT,
      voice TEXT,
      rag_top_k INTEGER,
      chunk_size INTEGER,
      chunk_overlap INTEGER
    );

    CREATE TABLE IF NOT EXISTS persona (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      job_description TEXT NOT NULL DEFAULT '',
      memory_prompt TEXT NOT NULL DEFAULT '',
      temperature REAL NOT NULL DEFAULT 0.7
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doc_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      used_rag INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

function seedStaticRows(): void {
  db.prepare(`INSERT OR IGNORE INTO settings (id) VALUES (1)`).run();
  db.prepare(`INSERT OR IGNORE INTO persona (id) VALUES (1)`).run();
}

interface SettingsRow {
  id: number;
  openai_api_key: string | null;
  ollama_base_url: string | null;
  lmstudio_base_url: string | null;
  model_text: string | null;
  model_embed: string | null;
  stt_model: string | null;
  tts_model: string | null;
  voice: string | null;
  rag_top_k: number | null;
  chunk_size: number | null;
  chunk_overlap: number | null;
}

interface PersonaRow {
  id: number;
  name: string;
  job_description: string;
  memory_prompt: string;
  temperature: number;
}

interface DocumentRow {
  id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
}

interface DocumentWithChunkCountRow extends DocumentRow {
  chunk_count: number;
}

interface ConversationRow {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  used_rag: number;
  created_at: string;
}

interface DocChunkRow {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  embedding: Buffer;
}

function mapSettingsRow(row: SettingsRow): Settings {
  return {
    id: 1,
    openaiApiKey: row.openai_api_key,
    ollamaBaseUrl: row.ollama_base_url,
    lmstudioBaseUrl: row.lmstudio_base_url,
    modelText: row.model_text,
    modelEmbed: row.model_embed,
    sttModel: row.stt_model,
    ttsModel: row.tts_model,
    voice: row.voice,
    ragTopK: row.rag_top_k,
    chunkSize: row.chunk_size,
    chunkOverlap: row.chunk_overlap,
  };
}

function mapPersonaRow(row: PersonaRow): Persona {
  return {
    id: 1,
    name: row.name,
    jobDescription: row.job_description,
    memoryPrompt: row.memory_prompt,
    temperature: row.temperature,
  };
}

function mapDocumentRow(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    usedRag: Boolean(row.used_rag),
    createdAt: row.created_at,
  };
}

function toFloat32Array(vector: Float32Array | number[]): Float32Array {
  return vector instanceof Float32Array ? new Float32Array(vector) : Float32Array.from(vector);
}

function serializeEmbedding(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer.slice(vector.byteOffset, vector.byteOffset + vector.byteLength));
}

function deserializeEmbedding(buffer: Buffer): Float32Array {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Float32Array(arrayBuffer);
}

