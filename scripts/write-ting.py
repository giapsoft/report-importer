"""Sinh lại ting.wav (không cần TTS)."""
import math
import struct
import wave
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds" / "digits" / "ting.wav"


def write_ting_wav(path: Path) -> None:
    sample_rate = 22050
    duration = 0.09
    volume = 0.92
    n = int(sample_rate * duration)

    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for i in range(n):
            t = i / sample_rate
            env = math.exp(-t * 28)
            tone = (
                0.62 * math.sin(2 * math.pi * 1760 * t)
                + 0.38 * math.sin(2 * math.pi * 2640 * t)
            )
            sample = int(volume * 32767 * tone * env)
            sample = max(-32767, min(32767, sample))
            wf.writeframesraw(struct.pack("<h", sample))


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    write_ting_wav(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
