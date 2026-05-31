export function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Скачивает файл по URL, принудительно вызывая диалог сохранения.
 * Presigned-ссылки обычно ведут на другой origin, поэтому атрибут `download`
 * у обычной ссылки игнорируется браузером — приходится тянуть файл в blob
 * и отдавать его как object URL. Бросает ошибку, если запрос не удался
 * (например, из-за CORS) — вызывающий код может откатиться на window.open.
 */
export async function downloadFileFromUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось скачать файл: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
