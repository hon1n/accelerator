/**
 * Бекенд возвращает поле `result` как json.RawMessage без жёсткой схемы —
 * формат зависит от воркеров. Эти хелперы пытаются вытащить из произвольного
 * объекта ожидаемые UI-данные: текст конспекта и список реплик стенограммы.
 */

export interface TranscriptEntry {
  speaker: string;
  timestamp: string;
  text: string;
  /** Время начала реплики в секундах (для перехода в плеере), если известно */
  startSeconds: number | null;
}

export interface NormalizedTaskResult {
  summary: string | null;
  transcript: TranscriptEntry[];
  /** Сырой JSON для отладки/раскрытия, если ничего не распознано */
  raw: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const v = value[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function extractSummary(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  return pickString(raw, ["summary", "summary_text", "result", "text", "markdown"]);
}

function secondsToTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Парсит "HH:MM:SS" / "MM:SS" / "SS" (допускает дробные секунды) в секунды. */
function timestampToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 0 || parts.length > 3) return null;
  let seconds = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isFinite(n)) return null;
    seconds = seconds * 60 + n;
  }
  return seconds;
}

function normalizeEntry(entry: unknown): TranscriptEntry | null {
  if (!isRecord(entry)) return null;

  const text =
    pickString(entry, ["text", "content", "utterance"]) ?? "";
  if (!text.trim()) return null;

  const speaker =
    pickString(entry, ["speaker", "speaker_id", "speaker_label"]) ?? "Спикер";

  let startSeconds: number | null = null;
  let timestamp = pickString(entry, ["timestamp", "time"]);

  const start = entry["start"];
  if (typeof start === "number" && Number.isFinite(start)) {
    startSeconds = start;
    if (!timestamp) timestamp = secondsToTimestamp(start);
  } else if (typeof start === "string") {
    startSeconds = timestampToSeconds(start);
    if (!timestamp) timestamp = start;
  }

  // Если числового start не было, но есть строковый timestamp — пытаемся
  // вытащить секунды из него, чтобы работал переход по клику.
  if (startSeconds === null && timestamp) {
    startSeconds = timestampToSeconds(timestamp);
  }

  return {
    speaker,
    timestamp: timestamp ?? "",
    text: text.trim(),
    startSeconds,
  };
}

function extractTranscript(raw: unknown): TranscriptEntry[] {
  const candidates: unknown[] = [];

  if (Array.isArray(raw)) {
    candidates.push(raw);
  } else if (isRecord(raw)) {
    for (const key of ["transcript", "segments", "diarization", "entries", "messages"]) {
      if (Array.isArray(raw[key])) candidates.push(raw[key]);
    }
  }

  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    const entries = list
      .map(normalizeEntry)
      .filter((e): e is TranscriptEntry => e !== null);
    if (entries.length > 0) return entries;
  }

  return [];
}

export function normalizeTaskResult(raw: unknown): NormalizedTaskResult {
  return {
    summary: extractSummary(raw),
    transcript: extractTranscript(raw),
    raw,
  };
}

export function isResultEmpty(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === "string") return raw.trim().length === 0;
  if (Array.isArray(raw)) return raw.length === 0;
  if (isRecord(raw)) return Object.keys(raw).length === 0;
  return false;
}
