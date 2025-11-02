"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface DocumentItem {
  id: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
  chunkCount: number;
}

interface DocumentsResponse {
  documents: DocumentItem[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function Upload() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasDocuments = documents.length > 0;

  const fetchDocuments = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      const payload = (await response.json()) as DocumentsResponse;
      setDocuments(payload.documents ?? []);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to load documents", error);
      setErrorMessage("Unable to load documents. Try refreshing the page.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const resetFeedback = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) {
        return;
      }

      resetFeedback();
      setProgress(0);

      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/documents/upload");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            setProgress(null);

            if (xhr.status >= 200 && xhr.status < 300) {
              setStatusMessage("Upload complete");
              resolve();
            } else {
              try {
                const payload = JSON.parse(xhr.responseText) as { error?: string };
                setErrorMessage(payload.error ?? "Upload failed");
              } catch {
                setErrorMessage("Upload failed");
              }
              resolve();
            }
          }
        };

        xhr.onerror = () => {
          setProgress(null);
          setErrorMessage("Network error while uploading");
          resolve();
        };

        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      });

      await fetchDocuments();
    },
    [fetchDocuments, resetFeedback]
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      void handleUpload(file);
      event.target.value = "";
    },
    [handleUpload]
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragOver(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleUpload(file);
      }
    },
    [handleUpload]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver]);

  const onDragLeave = useCallback(() => {
    if (isDragOver) {
      setIsDragOver(false);
    }
  }, [isDragOver]);

  const dropzoneClasses = useMemo(
    () =>
      [
        "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors",
        isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400",
      ].join(" "),
    [isDragOver]
  );

  return (
    <div className="space-y-6">
      <div>
        <label
          className={dropzoneClasses}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input type="file" className="hidden" onChange={onInputChange} accept=".pdf,.docx,.txt" />
          <p className="text-base font-medium text-slate-700">Drop a PDF, DOCX, or TXT file here</p>
          <p className="text-sm text-slate-500 mt-2">or click to browse your computer</p>
        </label>
      </div>

      {progress !== null && (
        <div className="w-full">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {statusMessage && <p className="text-sm text-green-600">{statusMessage}</p>}
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Uploaded Documents</h2>
          {isRefreshing && <span className="text-xs text-slate-500">Refreshing…</span>}
        </div>

        {hasDocuments ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Filename</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Chunks</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Size</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => (
                  <tr key={document.id} className="bg-white">
                    <td className="px-4 py-2 text-slate-800">{document.filename}</td>
                    <td className="px-4 py-2 text-slate-700">{document.chunkCount}</td>
                    <td className="px-4 py-2 text-slate-700">{formatSize(document.sizeBytes)}</td>
                    <td className="px-4 py-2 text-slate-500">{formatDate(document.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No documents uploaded yet.</p>
        )}
      </section>
    </div>
  );
}
