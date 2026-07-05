/** Cắt im lặng trên file số đã có — chạy một lần, commit file vào public/. */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "frontend", "public", "sounds", "digits");
const SILENCE_DB = "-32dB";

const require = createRequire(join(ROOT, "frontend", "package.json"));
const ffmpegPath = require("ffmpeg-static");

if (!ffmpegPath) {
  console.error("ffmpeg-static không tìm thấy. Chạy: cd frontend && npm install");
  process.exit(1);
}

const af = [
  `silenceremove=start_periods=1:start_duration=0.01:start_threshold=${SILENCE_DB}:detection=rms`,
  "areverse",
  `silenceremove=start_periods=1:start_duration=0.01:start_threshold=${SILENCE_DB}:detection=rms`,
  "areverse",
].join(",");

function trimFile(input) {
  const tmp = `${input}.trim.tmp.mp3`;
  execFileSync(ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-af",
    af,
    tmp,
  ]);
  unlinkSync(input);
  renameSync(tmp, input);
}

for (const name of readdirSync(OUT).filter((f) => /^[0-9]\.mp3$/.test(f))) {
  const path = join(OUT, name);
  const before = statSync(path).size;
  trimFile(path);
  const after = statSync(path).size;
  console.log(`${name}: ${before} -> ${after} bytes`);
}
