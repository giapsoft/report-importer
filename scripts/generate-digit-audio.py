"""Generate Vietnamese Northern digit WAV clips and ting separator."""
from __future__ import annotations

import asyncio
import math
import shutil
import struct
import subprocess
import tempfile
import wave
from pathlib import Path

import edge_tts
import numpy as np
import static_ffmpeg

static_ffmpeg.add_paths()

VOICE = "vi-VN-HoaiMyNeural"
OUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds" / "digits"

# Trim near-silent edges; minimal padding so clips stay tight but speech is safe.
PEAK_FLOOR_RATIO = 0.07
PADDING_MS = 12
FRAME_MS = 4

DIGITS: dict[str, str] = {
    "0": "không",
    "1": "một",
    "2": "hai",
    "3": "ba",
    "4": "bốn",
    "5": "năm",
    "6": "sáu",
    "7": "bảy",
    "8": "tám",
    "9": "chín",
}

VOCAB: dict[str, str] = {
    "trieu": "triệu",
    "nghin": "nghìn",
}

FFMPEG = shutil.which("ffmpeg")


def require_ffmpeg() -> None:
    if not FFMPEG:
        raise RuntimeError("ffmpeg not found after static_ffmpeg.add_paths()")


def decode_to_pcm(path: Path) -> tuple[np.ndarray, int]:
    assert FFMPEG
    cmd = [
        FFMPEG,
        "-i",
        str(path),
        "-f",
        "s16le",
        "-ac",
        "1",
        "-ar",
        "24000",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, check=True, capture_output=True)
    samples = np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32)
    return samples, 24000


def trim_pcm(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    if samples.size == 0:
        return samples

    peak = float(np.max(np.abs(samples)))
    if peak <= 0:
        return samples

    threshold = peak * PEAK_FLOOR_RATIO
    frame = max(1, int(sample_rate * FRAME_MS / 1000))
    frame_count = max(1, int(np.ceil(samples.size / frame)))

    loud_frames = []
    for i in range(frame_count):
        chunk = samples[i * frame : (i + 1) * frame]
        if chunk.size == 0:
            continue
        rms = float(np.sqrt(np.mean(chunk * chunk)))
        if rms > threshold:
            loud_frames.append(i)

    if not loud_frames:
        above = np.flatnonzero(np.abs(samples) > threshold)
        if above.size == 0:
            return samples
        start = int(above[0])
        end = int(above[-1]) + 1
    else:
        start = loud_frames[0] * frame
        end = min(samples.size, (loud_frames[-1] + 1) * frame)

    pad = int(sample_rate * PADDING_MS / 1000)
    start = max(0, start - pad)
    end = min(samples.size, end + pad)
    return samples[start:end]


def write_wav(path: Path, samples: np.ndarray, sample_rate: int) -> None:
    clipped = np.clip(samples, -32767, 32767).astype(np.int16)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(clipped.tobytes())


async def generate_digit_wav(digit: str, word: str) -> None:
    out = OUT_DIR / f"{digit}.wav"
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        raw_path = Path(tmp.name)

    try:
        communicate = edge_tts.Communicate(word, VOICE, rate="-5%")
        await communicate.save(str(raw_path))
        pcm, sr = decode_to_pcm(raw_path)
        trimmed = trim_pcm(pcm, sr)
        write_wav(out, trimmed, sr)
    finally:
        raw_path.unlink(missing_ok=True)

    print(f"  wrote {out.name} ({out.stat().st_size:,} bytes)")


def generate_ting_wav() -> None:
    """Short soft tone between numbers — no trim, fade in/out built in."""
    out = OUT_DIR / "ting.wav"
    sample_rate = 24000
    duration_s = 0.09
    frequency = 880.0
    amplitude = 0.45
    fade_ms = 10

    n_samples = int(sample_rate * duration_s)
    fade_samples = int(sample_rate * fade_ms / 1000)

    frames: list[int] = []
    for i in range(n_samples):
        t = i / sample_rate
        sample = amplitude * math.sin(2 * math.pi * frequency * t)

        if i < fade_samples:
            sample *= i / fade_samples
        elif i > n_samples - fade_samples:
            sample *= (n_samples - i) / fade_samples

        frames.append(int(max(-1, min(1, sample)) * 32767))

    with wave.open(str(out), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"".join(struct.pack("<h", s) for s in frames))

    print(f"  wrote {out.name} ({out.stat().st_size:,} bytes)")


def remove_legacy_mp3() -> None:
    for mp3 in OUT_DIR.glob("*.mp3"):
        mp3.unlink()
        print(f"  removed {mp3.name}")


async def main() -> None:
    require_ffmpeg()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUT_DIR}")
    print(f"Voice:  {VOICE}")
    print(f"Trim:   peak floor={PEAK_FLOOR_RATIO}, frame={FRAME_MS}ms, pad={PADDING_MS}ms")

    for digit, word in DIGITS.items():
        await generate_digit_wav(digit, word)

    for key, word in VOCAB.items():
        await generate_digit_wav(key, word)

    generate_ting_wav()
    remove_legacy_mp3()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
