/**
 * Chuyển text lẫn tạp (speech-to-text, tiếng Việt, ký tự thừa) thành số nguyên.
 * Trả về null nếu không trích được số hợp lệ.
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

  // Ưu tiên dạng số viết liền / có dấu phân cách
  const digitMatch = extractDigitNumber(text);
  if (digitMatch != null) return digitMatch;

  // Dạng chữ số tiếng Việt + hậu tố đơn vị
  const wordMatch = extractVietnameseWordNumber(text);
  if (wordMatch != null) return wordMatch;

  return null;
}

function extractDigitNumber(text: string): number | null {
  // Bắt cụm số kiểu: 1.234.567 | 1,234,567 | 1234567 | 1.5tr | 100k | 2 triệu
  const patterns: RegExp[] = [
    /([+-]?\d{1,3}(?:[.,]\d{3})+)(?:\s*(k|nghin|nghìn|ngàn|ngan|tr|trieu|triệu|m))?/i,
    /([+-]?\d+(?:[.,]\d+)?)(?:\s*(k|nghin|nghìn|ngàn|ngan|tr|trieu|triệu|m))?/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const unit = (m[2] ?? "").toLowerCase();
    const numPart = m[1];
    const base = parseLocalizedNumber(numPart);
    if (base == null || Number.isNaN(base)) continue;
    return Math.trunc(applyUnit(base, unit));
  }
  return null;
}

function parseLocalizedNumber(s: string): number | null {
  const cleaned = s.replace(/\s/g, "");
  if (!cleaned) return null;

  // 1.234.567 hoặc 1,234,567 (phân cách hàng nghìn)
  if (/^[+-]?\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/[.,]/g, ""));
  }

  // 1.5 hoặc 1,5 (thập phân)
  if (/^[+-]?\d+[.,]\d+$/.test(cleaned)) {
    return Number(cleaned.replace(",", "."));
  }

  if (/^[+-]?\d+$/.test(cleaned)) return Number(cleaned);
  return null;
}

function applyUnit(n: number, unit: string): number {
  switch (unit) {
    case "k":
    case "nghin":
    case "nghìn":
    case "ngan":
    case "ngàn":
      return n * 1_000;
    case "tr":
    case "trieu":
    case "triệu":
    case "m":
      return n * 1_000_000;
    default:
      return n;
  }
}

const DIGIT_WORDS: Record<string, number> = {
  khong: 0,
  không: 0,
  zero: 0,
  mot: 1,
  một: 1,
  mốt: 1,
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

const MULTIPLIERS: Record<string, number> = {
  muoi: 10,
  mười: 10,
  chuc: 10,
  chục: 10,
  tram: 100,
  trăm: 100,
  nghin: 1_000,
  nghìn: 1_000,
  ngan: 1_000,
  ngàn: 1_000,
  trieu: 1_000_000,
  triệu: 1_000_000,
  ty: 1_000_000_000,
  tỷ: 1_000_000_000,
};

function extractVietnameseWordNumber(text: string): number | null {
  const tokens = text
    .split(/[\s,;.]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let seen = false;

  for (const token of tokens) {
    if (DIGIT_WORDS[token] != null) {
      current += DIGIT_WORDS[token];
      seen = true;
      continue;
    }
    if (MULTIPLIERS[token] != null) {
      const mul = MULTIPLIERS[token];
      if (mul === 10) {
        current = (current === 0 ? 1 : current) * 10;
      } else if (current === 0) {
        current = mul;
      } else {
        current *= mul;
      }
      if (mul >= 1000) {
        total += current;
        current = 0;
      }
      seen = true;
      continue;
    }
    // token nhiễu từ speech-to-text — bỏ qua
  }

  if (!seen) return null;
  return Math.trunc(total + current);
}

/** Tách input batch theo splitter rồi map sang số, bỏ phần không parse được. */
export function parseBatchNumbers(input: string, splitter: string): number[] {
  const parts = input
    .toLowerCase()
    .split(new RegExp(escapeRegExp(splitter), "i"))
    .map((s) => s.trim())
    .filter(Boolean);

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
