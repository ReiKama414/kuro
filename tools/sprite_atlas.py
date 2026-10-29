"""Extract isolated 8 x 9 RGBA atlases into all 13 runtime animation strips.

python tools/sprite_atlas.py crow spider fox
Requires Pillow, numpy and scipy
"""
import argparse
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
CELL = 160


def rebuild(species, fixed_scale=None):
    if not re.fullmatch(r'[a-z][a-z0-9-]*', species):
        raise ValueError('Species must be a simple lowercase identifier')
    source = ROOT / 'uploads' / f'sheet-{species}.png'
    rgba = np.array(Image.open(source).convert('RGBA'))
    labels, _ = ndimage.label(rgba[:, :, 3] >= 40)
    components = []
    for index, box in enumerate(ndimage.find_objects(labels)):
        if box is not None and (labels[box] == index + 1).sum() >= 1500:
            components.append((index + 1, box))
    # The fox atlas has three airborne poses rather than four in row eight.
    # Preserve its seven real jump/landing frames instead of inventing a pose.
    row_counts = [8] * 7 + [7, 8] if species == 'fox' else [8] * 9
    if len(components) != sum(row_counts):
        raise ValueError(f'{species}: expected {sum(row_counts)} isolated bodies, found {len(components)}')
    components.sort(key=lambda entry: (entry[1][0].start + entry[1][0].stop) / 2)
    rows = []
    start = 0
    for count in row_counts:
        rows.append(sorted(components[start:start + count], key=lambda entry: entry[1][1].start))
        start += count
    max_width = max(box[1].stop - box[1].start + 6 for _, box in components)
    max_height = max(box[0].stop - box[0].start + 6 for _, box in components)
    idle_height = np.median([box[0].stop - box[0].start for _, box in rows[0]])
    # One scale for the entire character; wide wings/legs/tails also fit safely.
    max_body_width = 144 if species == 'fox' else 130
    scale = fixed_scale or min(1.0, 98 / idle_height, max_body_width / max_width, 132 / max_height)
    rendered_rows = []
    for entries in rows:
        frames = []
        for component, (y, x) in entries:
            y0, y1 = max(0, y.start - 3), min(rgba.shape[0], y.stop + 3)
            x0, x1 = max(0, x.start - 3), min(rgba.shape[1], x.stop + 3)
            patch = rgba[y0:y1, x0:x1].copy()
            core_labels = labels[y0:y1, x0:x1]
            own_core = core_labels == component
            # Keep the soft fringe without borrowing a neighbouring tail/nose.
            keep = ndimage.binary_dilation(own_core, iterations=2)
            keep &= (core_labels == component) | (core_labels == 0)
            keep &= patch[:, :, 3] >= 24
            patch[~keep] = 0
            image = Image.fromarray(patch)
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
            ys, xs = np.nonzero(np.array(image)[:, :, 3] >= 24)
            frame = Image.new('RGBA', (CELL, CELL))
            frame.alpha_composite(image, (round(CELL / 2 - (xs.min() + xs.max()) / 2), 153 - int(ys.max())))
            frames.append(frame)
        rendered_rows.append(frames)
    rows = rendered_rows
    clips = {
        'idle': rows[0], 'blink': rows[1], 'walk_right': rows[2],
        'walk_left': [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in rows[2]],
        'walk_down': rows[3], 'walk_up': rows[4], 'run_right': rows[5],
        'run_left': [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in rows[5]],
        'sit': rows[6][:4], 'lay': rows[6][4:], 'sleep': rows[7][:4],
        'jump': rows[7][4:] + rows[8][:4], 'hit': rows[8][4:],
    }
    output = ROOT / 'assets' / 'sprites' / species
    output.mkdir(parents=True, exist_ok=True)
    for name, frames in clips.items():
        strip = Image.new('RGBA', (len(frames) * CELL, CELL))
        for index, frame in enumerate(frames):
            strip.alpha_composite(frame, (index * CELL, 0))
        strip.save(output / f'{name}.png')
    path = ROOT / 'assets/sprites/counts.json'
    counts = json.loads(path.read_text(encoding='utf-8'))
    counts[species] = {name: len(frames) for name, frames in clips.items()}
    path.write_text(json.dumps(counts, indent=2) + '\n', encoding='utf-8')
    print(f'{species}: {sum(row_counts)} source poses -> 13 clips, uniform scale {scale:.3f}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('species', nargs='+')
    for name in parser.parse_args().species:
        rebuild(name)
