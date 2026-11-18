"""Build one MP3 per card, read and quiz, with local Piper TTS (free, runs here). The Listen player queues these.
Needs: pip install piper-tts, ffmpeg, and a voice model:
  PIPER_VOICE=/path/en_US-ryan-medium.onnx python3 tools/make_clips.py
Quiz clips bake the gap in (a page timer is unreliable with the screen locked), sized to the answer's length.
Optional: --only id1,id2 (or positional ids) rebuilds just those cards; OUT_DIR overrides the output folder.
Text comes from src/data/cards.json, so the audio always matches the cards."""
import json, os, re, subprocess, sys, wave, tempfile
from piper import PiperVoice

voice = PiperVoice.load(os.environ["PIPER_VOICE"])
cards = json.load(open("src/data/cards.json"))
ids = {i for a in sys.argv[1:] if a != "--only" for i in a.split(",") if i}
if ids: cards = [c for c in cards if c["id"] in ids]
out = os.environ.get("OUT_DIR", "public/audio/cards"); os.makedirs(out, exist_ok=True)
tmp = tempfile.mkdtemp()
rate = voice.config.sample_rate

# Abbreviations the voice reads as words ("OCS" as "ox", "ADM" as "adum"), spelled out the way you'd say them.
# A spaced letter A is squashed to "uh" (dotted letters come out garbled), so the voice is given "eigh" for the letter A.
SAY = {"OOD": "O O D", "OCS": "O C S", "USN": "U S N", "ENS": "E N S", "MCPON": "M C P O N", "MCPO": "M C P O",
       "SA": "S eigh", "ADM": "eigh D M", "FADM": "F eigh D M", "RADM": "R eigh D M", "VADM": "V eigh D M",
       "CAPT": "C eigh P T", "Capt": "Captain", "Maj": "Major", "MajGen": "Major Gen", "SgtMaj": "S G T Major",
       "PO1": "P O one", "PO2": "P O two", "PO3": "P O three", "WO1": "W O one"}
ABBR = re.compile(r"\b(" + "|".join(sorted(SAY, key=len, reverse=True)) + r")\b")
# Phonetic alphabet words the voice gets wrong; the rest are read as the word alone (the card's guide in parentheses is dropped).
PHON_SAY = {"phon-053": "al fah", "phon-054": "brah-voh", "phon-064": "lee mah", "phon-067": "oss cah", "phon-068": "pah pah",
            "phon-069": "kay beck", "phon-071": "see air rah", "phon-078": "zoo loo"}

def talk(c):  # what the voice says for a card's answer
    if c["sec"] == "phon": return PHON_SAY.get(c["id"]) or re.sub(r"\s*\(.*?\)", "", c["full"])
    return c["full"]

def spoken(t):  # symbols the voice would read literally ("hash 2", "slash"), spelled the way you'd say them
    t = ABBR.sub(lambda m: SAY[m.group(1)], t)
    t = re.sub(r"#\s*(\d+)", r"number \1", t)
    t = t.replace("Sir/Ma'am", "Sir or Ma'am").replace("(s)", "s")
    t = re.sub(r"\b1/2[- ]inch", "one half inch", t); t = re.sub(r"\b1/4[- ]inch", "one quarter inch", t)
    t = re.sub(r"\b1/8(?:th)?[- ]inch", "one eighth inch", t)
    return t.replace("/", " or ")

def say(text, path):
    text = spoken(text)
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
    say(c["prompt"] + ".", p); say_parts(talk(c), a, "x")
    silence(gap(c["full"]), f"{tmp}/s_gap.wav")
    for mode, mid in (("read", "s_short"), ("quiz", "s_gap")):
        lst = f"{tmp}/{mode}.txt"
        open(lst, "w").write("".join(f"file '{x}'\n" for x in (p, f"{tmp}/{mid}.wav", a, f"{tmp}/s_long.wav")))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-b:a", "48k", f"{out}/{c['id']}-{mode}.mp3"], check=True)
print(len(cards), "cards,", len(os.listdir(out)), "files,", sum(os.path.getsize(f"{out}/{f}") for f in os.listdir(out)) // 1024, "KB")
