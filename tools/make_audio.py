"""Build per-section MP3s (read and quiz) with local Piper TTS. Needs: pip install piper-tts, ffmpeg,
and a voice model: PIPER_VOICE=/path/en_US-ryan-medium.onnx python3 tools/make_audio.py
Text comes from src/data/cards.json, so the audio always matches the cards."""
import json, os, subprocess, wave, tempfile
from piper import PiperVoice

voice = PiperVoice.load(os.environ["PIPER_VOICE"])
cards = json.load(open("src/data/cards.json"))
out = "public/audio"; os.makedirs(out, exist_ok=True)
tmp = tempfile.mkdtemp()
rate = voice.config.sample_rate

def say(text, path):
    with wave.open(path, "wb") as w:
        voice.synthesize_wav(text, w)

def silence(sec, path):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(b"\0\0" * int(rate * sec))

silence(0.9, f"{tmp}/s_short.wav"); silence(6, f"{tmp}/s_gap.wav"); silence(1.2, f"{tmp}/s_long.wav")
secs = list(dict.fromkeys(c["sec"] for c in cards))
for sec in secs:
    cs = [c for c in cards if c["sec"] == sec]
    for mode in ("read", "quiz"):
        parts = []
        for i, c in enumerate(cs):
            a, b = f"{tmp}/{sec}{i}p.wav", f"{tmp}/{sec}{i}a.wav"
            say(c["prompt"] + ".", a); say(c["full"] if mode == "quiz" else c["full"], b)
            parts += [a, f"{tmp}/s_gap.wav" if mode == "quiz" else f"{tmp}/s_short.wav", b, f"{tmp}/s_long.wav"]
        lst = f"{tmp}/{sec}{mode}.txt"
        open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-b:a", "48k", f"{out}/{sec}-{mode}.mp3"], check=True)
        print(sec, mode, os.path.getsize(f"{out}/{sec}-{mode}.mp3") // 1024, "KB")
json.dump({s: [c["secName"] for c in cards if c["sec"] == s][0] for s in secs}, open(f"{out}/index.json", "w"))
