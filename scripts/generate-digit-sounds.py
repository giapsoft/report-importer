"""Sinh file âm thanh chữ số ti-VN + tiếng ting (chạy một lần khi cần tái tạo)."""
import asyncio
import math
import struct
import wave
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds" / "digits"
VOICE = "vi-VN-HoaiMyNeural"
RATE = "+40%"

DIGITS = {
    0: "không",
    1: "một",
    2: "hai",
    3: "ba",
    4: "bốn",
    5: "năm",
    6: "sáu",
    7: "bảy",
    8: "tám",
    9: "chín",
}


def write_ting_wav(path: Path) -> None:
    """Tiếng ting ngắn (~90ms), âm cao rõ, không dùng TTS."""
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


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    for digit, word in DIGITS.items():
        out = OUT / f"{digit}.mp3"
        communicate = edge_tts.Communicate(word, VOICE, rate=RATE)
        await communicate.save(str(out))
        print(f" wrote {out.name}")

    ting_path = OUT / "ting.wav"
    write_ting_wav(ting_path)
    print(f" wrote {ting_path.name}")
    print("Chạy tiếp: cd frontend && npm run trim-sounds")


if __name__ == "__main__":
    asyncio.run(main())
