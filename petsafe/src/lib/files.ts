// 업로드 파일 검증: 확장자·MIME·크기·매직바이트. 악성파일 검사는 scan_status 로 연결 지점을 둔다.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED: Record<string, { mimes: string[]; magic: (b: Uint8Array) => boolean }> = {
  pdf: { mimes: ["application/pdf"], magic: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  jpg: { mimes: ["image/jpeg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mimes: ["image/jpeg"], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mimes: ["image/png"], magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  webp: { mimes: ["image/webp"], magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 },
  heic: { mimes: ["image/heic", "image/heif"], magic: (b) => String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp" },
};

export type FileCheck = { ok: true; ext: string; mime: string } | { ok: false; error: string };

export function validateUpload(name: string, mime: string, bytes: Uint8Array): FileCheck {
  if (bytes.byteLength === 0) return { ok: false, error: "빈 파일은 올릴 수 없어요." };
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, error: "10MB 이하 파일만 올릴 수 있어요." };
  const ext = (name.split(".").pop() || "").toLowerCase();
  const rule = ALLOWED[ext];
  if (!rule) return { ok: false, error: "PDF, JPG, PNG, WEBP, HEIC 파일만 올릴 수 있어요." };
  const normalizedMime = rule.mimes.includes(mime) ? mime : rule.mimes[0];
  if (mime && mime !== "application/octet-stream" && !rule.mimes.includes(mime)) {
    return { ok: false, error: "파일 형식과 확장자가 맞지 않아요." };
  }
  if (!rule.magic(bytes)) return { ok: false, error: "파일 내용이 확장자와 맞지 않아요." };
  return { ok: true, ext, mime: normalizedMime };
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120) || "document";
}
