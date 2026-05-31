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

/** Грубая проверка, что строка — это http(s)-ссылка, а не текст конспекта. */
function isLikelyUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function extractSummary(raw: unknown): string | null {
  // Бекенд кладёт в `summary` presigned-ссылку на summary.md, а не текст.
  // Саму ссылку показывать нельзя — её содержимое подтягивает resolveTaskResult.
  if (typeof raw === "string") return isLikelyUrl(raw) ? null : raw;
  const value = pickString(raw, ["summary", "summary_text", "result", "text", "markdown"]);
  if (value && isLikelyUrl(value)) return null;
  return value;
}

/** Presigned-ссылка на файл конспекта (summary.md), если result её содержит. */
function extractSummaryUrl(raw: unknown): string | null {
  if (typeof raw === "string") return isLikelyUrl(raw) ? raw.trim() : null;
  const value = pickString(raw, ["summary", "summary_url", "summary_md"]);
  return value && isLikelyUrl(value) ? value.trim() : null;
}

/** Presigned-ссылка на JSON со стенограммой/диаризацией, если она есть. */
function extractTranscriptUrl(raw: unknown): string | null {
  const value = pickString(raw, ["transcript", "diarize", "diarization", "transcript_url"]);
  return value && isLikelyUrl(value) ? value.trim() : null;
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

/**
 * Достаёт текст конспекта из содержимого summary.md. Воркер суммаризации
 * сохраняет файл как JSON вида `{"status":"success","analysis_report":"<markdown>"}`,
 * но на случай, если положили чистый markdown, обрабатываем и его.
 */
function parseSummaryContent(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const report = pickString(parsed, ["analysis_report", "summary", "report", "text"]);
    if (report) return report;
    if (typeof parsed === "string" && parsed.trim()) return parsed;
  } catch {
    // не JSON — значит это уже готовый markdown
  }
  return trimmed;
}

/** Парсит содержимое JSON-файла диаризации/стенограммы в список реплик. */
function parseTranscriptContent(text: string): TranscriptEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    return extractTranscript(JSON.parse(trimmed));
  } catch {
    return [];
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    // CORS / истёкшая ссылка / сеть — молча отдаём null, UI покажет заглушку
    return null;
  }
}

/**
 * Бекенд отдаёт в `result` presigned-ссылки на summary.md и diarization.json,
 * а не сам контент. Эта функция догружает файлы по ссылкам и возвращает
 * результат с уже распарсенными текстом конспекта и стенограммой.
 *
 * Если содержимое было встроено напрямую (моки, будущий формат) — ссылок нет,
 * и мы просто возвращаем синхронно нормализованный результат.
 */
export async function resolveTaskResult(raw: unknown): Promise<NormalizedTaskResult> {
  const base = normalizeTaskResult(raw);

  const summaryUrl = extractSummaryUrl(raw);
  const transcriptUrl = extractTranscriptUrl(raw);

  if (!summaryUrl && !transcriptUrl) return base;

  const [summaryText, transcriptText] = await Promise.all([
    summaryUrl ? fetchText(summaryUrl) : Promise.resolve(null),
    transcriptUrl ? fetchText(transcriptUrl) : Promise.resolve(null),
  ]);

  return {
    summary: summaryText ? parseSummaryContent(summaryText) : base.summary,
    transcript: transcriptText
      ? parseTranscriptContent(transcriptText)
      : base.transcript,
    raw,
  };
}
