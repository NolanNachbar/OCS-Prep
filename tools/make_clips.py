"""Build one MP3 per card, read and quiz, with local Piper TTS (free, runs here). The Listen player queues these.
Needs: pip install piper-tts, ffmpeg, and a voice model:
  PIPER_VOICE=/path/en_US-ryan-medium.onnx python3 tools/make_clips.py
Quiz clips bake the gap in (a page timer is unreliable with the screen locked), sized to the answer's length.
Text comes from src/data/cards.json, so the audio always matches the cards."""
import json, os, re, subprocess, wave, tempfile
from piper import PiperVoice

voice = PiperVoice.load(os.environ["PIPER_VOICE"])
cards = json.load(open("src/data/cards.json"))
out = "public/audio/cards"; os.makedirs(out, exist_ok=True)
tmp = tempfile.mkdtemp()
rate = voice.config.sample_rate

def say(text, path):
    with wave.open(path, "wb") as w:
        voice.synthesize_wav(text, w)

def silence(sec, path):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(b"\0\0" * int(rate * sec))

def parts(text):  # one piece per sentence or labelled part, so each gets a real pause instead of running together
    t = re.sub(r" (?=(?:Collar|Shoulder board|Sleeve|Insignia):)", "\n", text)
    return [x.strip() for x in re.split(r"\n|(?<=[.!?;])\s+", t) if x.strip()]

def say_parts(text, path, n):  # concatenated speech with 0.55 s between pieces
    ps = parts(text); files = []
    for i, x in enumerate(ps):
        f = f"{tmp}/{n}{i}.wav"; say(x, f); files += [f] + ([f"{tmp}/s_beat.wav"] if i < len(ps) - 1 else [])
    lst = f"{tmp}/{n}.txt"; open(lst, "w").write("".join(f"file '{x}'\n" for x in files))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", path], check=True)

def gap(text):  # seconds to say it aloud: about 2.2 words a second plus a breath, never under 4 or over 40
    return min(40, max(4, 1.5 + len(text.split()) / 2.2))

silence(0.55, f"{tmp}/s_beat.wav"); silence(0.9, f"{tmp}/s_short.wav"); silence(1.2, f"{tmp}/s_long.wav")
for c in cards:
    p, a = f"{tmp}/p.wav", f"{tmp}/a.wav"
    say(c["prompt"] + ".", p); say_parts(c["full"], a, "x")
    silence(gap(c["full"]), f"{tmp}/s_gap.wav")
    for mode, mid in (("read", "s_short"), ("quiz", "s_gap")):
        lst = f"{tmp}/{mode}.txt"
        open(lst, "w").write("".join(f"file '{x}'\n" for x in (p, f"{tmp}/{mid}.wav", a, f"{tmp}/s_long.wav")))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-b:a", "48k", f"{out}/{c['id']}-{mode}.mp3"], check=True)
print(len(cards), "cards,", len(os.listdir(out)), "files,", sum(os.path.getsize(f"{out}/{f}") for f in os.listdir(out)) // 1024, "KB")
