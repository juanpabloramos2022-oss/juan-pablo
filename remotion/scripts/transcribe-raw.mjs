import path from "path";
import { execSync } from "child_process";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";
import fs from "fs";

const whisperPath = path.join(process.cwd(), "whisper.cpp");
const videoPath = path.join(process.cwd(), "public", "raw_video.mp4");
const wavPath = path.join(process.cwd(), "public", "raw_video.wav");
const captionsPath = path.join(process.cwd(), "public", "captions-raw.json");

// whisper.cpp and model already installed — skip reinstall if present
if (!fs.existsSync(path.join(whisperPath, "main"))) {
  console.log("Installing Whisper.cpp...");
  await installWhisperCpp({ to: whisperPath, version: "1.5.5" });
}

const modelPath = path.join(whisperPath, "models", "ggml-medium.bin");
if (!fs.existsSync(modelPath)) {
  console.log("Downloading model...");
  await downloadWhisperModel({ model: "medium", folder: whisperPath });
}

console.log("Converting video to 16KHz WAV...");
execSync(`ffmpeg -i "${videoPath}" -ar 16000 -ac 1 "${wavPath}" -y`, {
  stdio: "inherit",
});

console.log("Transcribing audio (Spanish)...");
const whisperCppOutput = await transcribe({
  model: "medium",
  whisperPath,
  whisperCppVersion: "1.5.5",
  inputPath: wavPath,
  tokenLevelTimestamps: true,
  language: "es",
});

const { captions } = toCaptions({ whisperCppOutput });

fs.writeFileSync(captionsPath, JSON.stringify(captions, null, 2));
console.log(`Captions written to ${captionsPath} (${captions.length} tokens)`);
