const SOUND_BASE = `${import.meta.env.BASE_URL}sounds/digits/`;

function extractDigitChars(raw: string | number): string[] {
  const s = String(raw).replace(/\./g, "").trim();
  if (!s) return [];
  const body = s.startsWith("-") ? s.slice(1) : s;
  if (!/^\d+$/.test(body)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return [];
    return String(Math.trunc(Math.abs(n))).split("");
  }
  return body.split("");
}

export function isAudioPlaybackSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof AudioContext !== "undefined" ||
      typeof (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext !== "undefined")
  );
}

let sharedCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let preloadPromise: Promise<void> | null = null;

/** Tốc độ phát (1 = bình thường). Giữ trong phiên, không lưu storage. */
let playbackRate = 1;

const MIN_PLAYBACK_RATE = 0.75;
const MAX_PLAYBACK_RATE = 2;
const TING_GAIN = 1.35;

export function getNumberAudioPlaybackRate(): number {
  return playbackRate;
}

export function setNumberAudioPlaybackRate(rate: number): void {
  playbackRate = Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, rate));
}

function createAudioContext(): AudioContext {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  return new Ctx();
}

/** Gọi đồng bộ ngay trong handler click — giữ quyền phát âm của trình duyệt. */
export function unlockNumberAudio(): void {
  if (!isAudioPlaybackSupported()) return;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = createAudioContext();
  }
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch((err) => {
      console.warn("Không mở khóa AudioContext", err);
    });
  }
}

async function ensureContextRunning(ctx: AudioContext): Promise<void> {
  if (ctx.state === "closed") {
    sharedCtx = createAudioContext();
    throw new Error("AudioContext đã đóng — thử bấm Nghe lại lần nữa");
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  if (ctx.state !== "running") {
    throw new Error(
      "Trình duyệt chưa cho phát âm — bấm Nghe lại hoặc tương tác trang trước",
    );
  }
}

async function getAudioContext(): Promise<AudioContext> {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = createAudioContext();
  }
  await ensureContextRunning(sharedCtx);
  return sharedCtx;
}

async function loadBuffer(
  ctx: AudioContext,
  key: string,
  url: string,
): Promise<AudioBuffer> {
  const cached = bufferCache.get(key);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không tải được âm thanh (${res.status}): ${url}`);
  }
  const data = await res.arrayBuffer();
  const buffer = await ctx.decodeAudioData(data.slice(0));
  bufferCache.set(key, buffer);
  return buffer;
}

async function preloadAll(ctx: AudioContext): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const loads: Promise<AudioBuffer>[] = [];
    for (let d = 0; d <= 9; d++) {
      loads.push(loadBuffer(ctx, String(d), `${SOUND_BASE}${d}.wav`));
    }
    loads.push(loadBuffer(ctx, "ting", `${SOUND_BASE}ting.wav`));
    await Promise.all(loads);
  })();

  try {
    await preloadPromise;
  } catch (err) {
    preloadPromise = null;
    throw err;
  }
}

async function playBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  signal: AbortSignal,
  options?: { gain?: number },
): Promise<void> {
  if (signal.aborted) return;

  await ensureContextRunning(ctx);
  if (signal.aborted) return;

  await new Promise<void>((resolve, reject) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = ctx.createGain();
    gainNode.gain.value = options?.gain ?? 1;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const finish = () => resolve();
    const fail = (err: unknown) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    source.onended = finish;
    signal.addEventListener("abort", finish, { once: true });

    try {
      source.start(0);
    } catch (err) {
      fail(err);
    }
  });
}

function formatAudioError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Không phát được âm thanh";
}

/** Phát offline: từng chữ số liền kề, ting ngắn giữa các số. */
export function playNumberListAudio(
  values: (string | number)[],
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (message: string) => void;
  },
): { stop: () => void } {
  const controller = new AbortController();
  const signal = controller.signal;
  let ended = false;

  const finish = () => {
    if (ended) return;
    ended = true;
    options?.onEnd?.();
  };

  const stop = () => {
    controller.abort();
    finish();
  };

  if (!isAudioPlaybackSupported()) {
    options?.onError?.("Trình duyệt không hỗ trợ phát âm thanh");
    finish();
    return { stop };
  }

  const parts = values
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map((v) => extractDigitChars(v))
    .filter((digits) => digits.length > 0);

  if (parts.length === 0) {
    options?.onError?.("Không có số hợp lệ để đọc");
    finish();
    return { stop };
  }

  options?.onStart?.();

  (async () => {
    try {
      const ctx = await getAudioContext();
      await preloadAll(ctx);
      if (signal.aborted) return;

      await ensureContextRunning(ctx);
      if (signal.aborted) return;

      const ting = bufferCache.get("ting");

      for (let i = 0; i < parts.length; i++) {
        if (signal.aborted) break;

        for (let j = 0; j < parts[i].length; j++) {
          if (signal.aborted) break;
          const digit = parts[i][j];
          const buf = bufferCache.get(digit);
          if (buf) await playBuffer(ctx, buf, signal);
        }

        if (signal.aborted) break;
        if (i < parts.length - 1 && ting) {
          await playBuffer(ctx, ting, signal, { gain: TING_GAIN });
        }
      }
    } catch (err) {
      console.error("Phát âm thanh số thất bại", err);
      if (!signal.aborted) {
        options?.onError?.(formatAudioError(err));
      }
    } finally {
      if (!signal.aborted) finish();
    }
  })();

  return { stop };
}

/** Xóa cache (tùy chọn, khi thoát app). */
export function clearNumberAudioCache(): void {
  bufferCache.clear();
  preloadPromise = null;
  if (sharedCtx && sharedCtx.state !== "closed") {
    void sharedCtx.close();
  }
  sharedCtx = null;
}
