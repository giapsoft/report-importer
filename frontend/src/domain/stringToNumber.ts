/**
 * Chuyển text lẫn tạp (speech-to-text, tiếng Việt, ký tự thừa) thành số nguyên.
 *
 * Quy tắc đọc: ghép từng chữ số theo thứ tự (vd. "một ba hai" → 132,
 * "tám một" / "chữ 8 số 1" → 81), không cộng hàng đơn vị.
 */
export function stringToNumber(raw: string): number | null {
  if (raw == null) return null;
  let text = String(raw).toLowerCase().normalize("NFC").trim();
  if (!text) return null;

  text = text
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s.,+\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const digits = collectDigits(text);
  if (!digits || digits.length === 0) return null;

  const n = Number(digits.join(""));
  return Number.isNaN(n) ? null : n;
}

/** Chữ số 0–9 bằng tiếng Việt (và biến thể speech-to-text). */
const DIGIT_WORDS: Record<string, number> = {
  khong: 0,
  không: 0,
  zero: 0,
  mot: 1,
  một: 1,
  mốt: 1,
  môt: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  bốn: 4,
  tu: 4,
  tư: 4,
  nam: 5,
  năm: 5,
  lam: 5,
  lăm: 5,
  sau: 6,
  sáu: 6,
  bay: 7,
  bảy: 7,
  tam: 8,
  tám: 8,
  chin: 9,
  chín: 9,
};

/** Nhiễu speech-to-text / nhãn đọc số — bỏ qua khi ghép. */
const NOISE_WORDS = new Set([
  "chu",
  "chữ",
  "ch",
  "so",
  "số",
  "num",
  "number",
  "cong",
  "cộng",
  "va",
  "và",
  "ky",
  "ký",
  "tram",
  "trăm",
  "nghin",
  "nghìn",
  "ngan",
  "ngàn",
  "trieu",
  "triệu",
  "ty",
  "tỷ",
  "k",
  "tr",
  "le",
  "lẻ",
  "linh",
  "het",
  "hết",
]);

const TENS_MARKERS = new Set(["muoi", "mười", "mươi", "chuc", "chục"]);

const SORTED_VOCAB = [
  ...Object.keys(DIGIT_WORDS),
  ...Array.from(TENS_MARKERS),
].sort((a, b) => b.length - a.length);

/** Trích dãy chữ số 0–9 theo thứ tự (dùng cho ghép số và batch). */
function collectDigits(text: string): number[] | null {
  const tokens = expandTokens(
    text
      .split(/[\s,;.]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  );

  if (tokens.length === 0) return null;

  const digits: number[] = [];
  let seen = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (NOISE_WORDS.has(token)) continue;

    if (DIGIT_WORDS[token] != null) {
      const d = DIGIT_WORDS[token];
      // "số 8 chữ tám" — bỏ chữ số trùng liền kề (8 rồi tám)
      if (digits.length === 0 || digits[digits.length - 1] !== d) {
        digits.push(d);
        seen = true;
      }
      continue;
    }

    if (TENS_MARKERS.has(token)) {
      const hasNext = hasNextDigitToken(tokens, i + 1);
      if (digits.length > 0) {
        if (hasNext) continue;
        digits.push(0);
      } else if (hasNext) {
        digits.push(1);
      } else {
        digits.push(1, 0);
      }
      seen = true;
      continue;
    }

    const numeric = token.match(/^[+-]?(\p{N}+)$/u);
    if (numeric) {
      for (const ch of numeric[1]) {
        const d = parseDigitChar(ch);
        if (d != null) digits.push(d);
      }
      seen = true;
      continue;
    }

    const embedded = extractEmbeddedDigits(token);
    if (embedded.length > 0) {
      digits.push(...embedded);
      seen = true;
    }
  }

  if (!seen || digits.length === 0) return null;
  return digits;
}

function parseDigitChar(ch: string): number | null {
  if (ch >= "0" && ch <= "9") return Number(ch);
  const cp = ch.codePointAt(0);
  if (cp == null) return null;
  // Fullwidth / unicode digits
  if (cp >= 0xff10 && cp <= 0xff19) return cp - 0xff10;
  return null;
}

function extractEmbeddedDigits(token: string): number[] {
  const out: number[] = [];
  for (const ch of token) {
    const d = parseDigitChar(ch);
    if (d != null) out.push(d);
  }
  return out;
}

function expandTokens(rawTokens: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    const next = rawTokens[i + 1];

    if (token === "m" && next && /^(?:ot|ôt|ốt|ột)$/u.test(next)) {
      out.push("mot");
      i++;
      continue;
    }

    if (/^\p{L}+$/u.test(token) && !DIGIT_WORDS[token] && !TENS_MARKERS.has(token)) {
      const parts = segmentGluedLetters(token);
      if (parts.length > 0) {
        out.push(...parts);
        continue;
      }
    }

    out.push(token);
  }

  return out;
}

function segmentGluedLetters(token: string): string[] {
  const lower = token.toLowerCase().normalize("NFC");
  const parts: string[] = [];
  let i = 0;

  while (i < lower.length) {
    let matched: string | null = null;
    for (const w of SORTED_VOCAB) {
      if (lower.startsWith(w, i)) {
        matched = w;
        break;
      }
    }
    if (!matched) return [];
    parts.push(matched);
    i += matched.length;
  }

  return parts;
}

function hasNextDigitToken(tokens: string[], start: number): boolean {
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i];
    if (NOISE_WORDS.has(t)) continue;
    if (TENS_MARKERS.has(t)) continue;
    if (DIGIT_WORDS[t] != null) return true;
    if (/^[+-]?\p{N}+$/u.test(t)) return true;
    if (extractEmbeddedDigits(t).length > 0) return true;
    return false;
  }
  return false;
}

/**
 * Tách batch theo splitter.
 * Nếu splitter cắt nhầm giữa các chữ số đơn (vd. "8 hết 1" → 81, không phải [8,1]).
 */
export function parseBatchNumbers(input: string, splitter: string): number[] {
  const trimmed = input.toLowerCase().trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(new RegExp(escapeRegExp(splitter), "i"))
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const n = stringToNumber(parts[0] ?? trimmed);
    return n != null ? [n] : [];
  }

  const groups = parts.map((p) => collectDigits(p)).filter((g): g is number[] => !!g?.length);

  if (
    groups.length === parts.length &&
    groups.length >= 2 &&
    groups.every((g) => g.length === 1)
  ) {
    const merged = Number(groups.map((g) => g[0]).join(""));
    if (!Number.isNaN(merged)) return [merged];
  }

  const numbers: number[] = [];
  for (const part of parts) {
    const n = stringToNumber(part);
    if (n != null) numbers.push(n);
  }
  return numbers;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
