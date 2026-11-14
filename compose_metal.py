"""Original Christmas heavy-metal loops and effects. No borrowed recordings."""
import math
import os
import struct
import wave

RATE = 22050
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'assets', 'audio')

GAMES = [
    ('campaign', 82.41, 1),
    ('prologue', 87.31, 2),
    ('night-broadcast', 98.00, 3),
    ('frosted-skies', 110.00, 4),
    ('white-rail', 73.42, 5),
    ('chapter-2', 92.50, 6),
    ('switch-tower', 103.83, 7),
    ('shelf-escape', 77.78, 8),
    ('listening-wire', 116.54, 9),
    ('holding-camp', 69.30, 10),
    ('wrapping-line', 123.47, 11),
    ('chimney-road', 65.41, 12),
]


def clamp(sample):
    if sample > 1:
        return 1
    if sample < -1:
        return -1
    return sample


def write_wav(path, samples):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'w') as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        frames = bytearray()
        for sample in samples:
            frames += struct.pack('<h', int(clamp(sample) * 32767))
        handle.writeframes(frames)


def env(length, attack, release):
    total = int(length * RATE)
    attack_n = max(1, int(attack * RATE))
    release_n = max(1, int(release * RATE))
    values = []
    for i in range(total):
        gain = 1
        if i < attack_n:
            gain = i / attack_n
        if i > total - release_n:
            gain *= (total - i) / release_n
        values.append(gain)
    return values


def guitar(frequency, length):
    total = int(length * RATE)
    out = []
    for i in range(total):
        t = i / RATE
        wave_sum = 0
        for harmonic in (1, 2, 3, 4):
            wave_sum += math.sin(2 * math.pi * frequency * harmonic * t) / harmonic
        shaped = math.tanh(wave_sum * 2.4)
        out.append(shaped)
    gain = env(length, 0.005, 0.03)
    return [out[i] * gain[i] for i in range(total)]


def bell(frequency, length):
    total = int(length * RATE)
    out = []
    for i in range(total):
        t = i / RATE
        tone = math.sin(2 * math.pi * frequency * t) * 0.7
        tone += math.sin(2 * math.pi * frequency * 2.01 * t) * 0.3
        out.append(tone * math.exp(-t * 6))
    return out


def kick(length):
    total = int(length * RATE)
    out = []
    for i in range(total):
        t = i / RATE
        freq = 90 * math.exp(-t * 18) + 42
        out.append(math.sin(2 * math.pi * freq * t) * math.exp(-t * 16))
    return out


def noise_hat(length):
    total = int(length * RATE)
    out = []
    state = 1
    for i in range(total):
        state = (1103515245 * state + 12345) & 0x7fffffff
        sample = (state / 0x3fffffff) - 1
        t = i / RATE
        out.append(sample * math.exp(-t * 48) * 0.35)
    return out


def mix_at(buffer, clip, start):
    offset = int(start * RATE)
    for i, sample in enumerate(clip):
        if 0 <= offset + i < len(buffer):
            buffer[offset + i] += sample


def loop(root, seed, seconds=8):
    buffer = [0.0] * int(seconds * RATE)
    beat = 60 / (168 + (seed % 5) * 6)
    bars = int(seconds / (beat * 4))
    melody = [0, 3, 7, 10, 12, 7, 3, 0]
    for bar in range(bars):
        for step in range(8):
            at = (bar * 4 + step / 2) * beat
            note = root * (2 ** (melody[(bar + step + seed) % len(melody)] / 12))
            mix_at(buffer, [s * 0.22 for s in guitar(note if step % 2 == 0 else root, beat * 0.42)], at)
            if step % 2 == 0:
                mix_at(buffer, [s * 0.55 for s in kick(0.16)], at)
            else:
                mix_at(buffer, noise_hat(0.08), at)
            if step % 4 == 2:
                mix_at(buffer, [s * 0.18 for s in bell(note * 2, 0.25)], at)
    return buffer


def effect(kind, root):
    if kind == 'wrong':
        return [s * 0.6 for s in guitar(root * 0.5, 0.28)]
    if kind == 'right':
        return [s * 0.5 for s in bell(root * 2, 0.22)]
    if kind == 'elf':
        return [s * 0.45 for s in bell(root * 3, 0.35)]
    return [s * 0.5 for s in guitar(root, 0.12)]


def main():
    for name, root, seed in GAMES:
        write_wav(os.path.join(OUT, name + '.wav'), loop(root, seed))
        for kind in ('wrong', 'right', 'elf', 'action'):
            write_wav(os.path.join(OUT, name + '-' + kind + '.wav'), effect(kind, root))
        print(name)


if __name__ == '__main__':
    main()
