"use client";

import type { MouseEvent, TouchEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PushToTalkProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function PushToTalk({ onTranscription, disabled = false }: PushToTalkProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupStream = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    mediaStreamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [cleanupStream]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        return;
      }

      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "speech.webm");

        const response = await fetch("/api/speech/stt", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorPayload?.error ?? "Unable to transcribe speech.");
        }

        const data = (await response.json()) as { text?: string };
        if (data.text) {
          onTranscription(data.text);
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unable to transcribe speech.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onTranscription]
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || isRecording || isProcessing) {
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setError(null);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        cleanupStream();
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        void transcribe(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone permission denied.");
    }
  }, [cleanupStream, disabled, isProcessing, isRecording, transcribe]);

  const handlePressStart = useCallback(
    (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
      event.preventDefault();
      void startRecording();
    },
    [startRecording]
  );

  const handlePressEnd = useCallback(
    (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
      event.preventDefault();
      stopRecording();
    },
    [stopRecording]
  );

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={() => {
          if (isRecording) {
            stopRecording();
          }
        }}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || isProcessing}
      >
        {isRecording ? "Release to Send" : isProcessing ? "Transcribing…" : "Hold to Talk"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
