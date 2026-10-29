"""Extract all 13 panda clips from the generated, genuinely transparent atlas.

python tools/slice-panda.py
Requires Pillow, numpy and scipy. Uses alpha only, never a colour key.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
CELL = 160


def main():
    rgba = np.array(Image.open(ROOT / 'uploads/sheet-panda.png').convert('RGBA'))
    labels, _ = ndimage.label(rgba[:, :, 3] >= 40)
    components = []
    for index, box in enumerate(ndimage.find_objects(labels)):
        if box is None:
            continue
        size = int((labels[box] == index + 1).sum())
        if size >= 1500:
            components.append((index + 1, box))
    if len(components) != 72:
        raise ValueError(f'Expected exactly 72 isolated bodies, found {len(components)}')
    components.sort(key=lambda item: (item[1][0].start + item[1][0].stop) / 2)
    rows = []
    for row in range(9):
        entries = sorted(components[row * 8:(row + 1) * 8], key=lambda item: item[1][1].start)
        frames = []
        for component, box in entries:
            y, x = box
            # Keep natural antialiasing surrounding the connected opaque body.
            y0, y1 = max(0, y.start - 3), min(rgba.shape[0], y.stop + 3)
            x0, x1 = max(0, x.start - 3), min(rgba.shape[1], x.stop + 3)
            patch = rgba[y0:y1, x0:x1].copy()
            local_labels, _ = ndimage.label(patch[:, :, 3] >= 24)
            sizes = np.bincount(local_labels.ravel()); sizes[0] = 0
            keep = local_labels == sizes.argmax()
            patch[~keep] = 0
            image = Image.fromarray(patch)
            # A single scale for the entire atlas avoids pose-dependent zoom.
            image = image.resize((round(image.width * 0.78), round(image.height * 0.78)), Image.Resampling.LANCZOS)
            alpha = np.array(image)[:, :, 3]
            yy, xx = np.nonzero(alpha >= 24)
            frame = Image.new('RGBA', (CELL, CELL))
            offset = (round(CELL / 2 - (xx.min() + xx.max()) / 2), 153 - int(yy.max()))
            frame.alpha_composite(image, offset)
            frames.append(frame)
        rows.append(frames)
    clips = {
        'idle': rows[0], 'blink': rows[1], 'walk_right': rows[2],
        'walk_left': [image.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for image in rows[2]],
        'walk_down': rows[3], 'walk_up': rows[4], 'run_right': rows[5],
        'run_left': [image.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for image in rows[5]],
        'sit': rows[6][:4], 'lay': rows[6][4:], 'sleep': rows[7][:4],
        'jump': rows[7][4:] + rows[8][:4], 'hit': rows[8][4:],
    }
    output = ROOT / 'assets/sprites/panda'
    output.mkdir(parents=True, exist_ok=True)
    for name, frames in clips.items():
        strip = Image.new('RGBA', (len(frames) * CELL, CELL))
        for index, frame in enumerate(frames):
            strip.alpha_composite(frame, (index * CELL, 0))
        strip.save(output / f'{name}.png')
    path = ROOT / 'assets/sprites/counts.json'
    counts = json.loads(path.read_text())
    counts['panda'] = {name: len(frames) for name, frames in clips.items()}
    path.write_text(json.dumps(counts, indent=2) + '\n')
    print('Extracted 72 source poses into 13 panda clips, including mirrored leftward gaits')


if __name__ == '__main__':
    main()
