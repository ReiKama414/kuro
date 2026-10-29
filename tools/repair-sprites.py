"""Recover keyed-out eye colour from source pixels and fix a seal ground anchor.

Run after legacy slicing: python tools/repair-sprites.py
Requires Pillow, numpy, scipy, opencv-python
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ROWS = {
    'idle': (0, 0, 897, 169), 'blink': (900, 0, 1536, 169),
    'walk_right': (0, 170, 770, 338), 'walk_left': (772, 170, 1536, 338),
    'walk_down': (0, 339, 770, 510), 'walk_up': (772, 339, 1536, 510),
    'run_right': (0, 511, 770, 675), 'run_left': (772, 511, 1536, 675),
    'sit': (0, 676, 480, 836), 'lay': (480, 676, 1005, 836), 'sleep': (1005, 676, 1536, 836),
    'jump': (0, 837, 1015, 1024), 'hit': (1015, 837, 1536, 1024),
}


def restore_cat():
    source = np.array(Image.open(ROOT / 'uploads/sheet-cat.png').convert('RGBA'))
    counts = json.loads((ROOT / 'assets/sprites/counts.json').read_text())['cat']
    recovered = 0
    pending = []
    for clip, count in counts.items():
        path = ROOT / 'assets/sprites/cat' / f'{clip}.png'
        strip = np.array(Image.open(path))
        x0, y0, x1, y1 = ROWS[clip]
        region = source[y0:y1, x0:x1]
        for index in range(count):
            frame = strip[:, index * 160:(index + 1) * 160]
            mask = frame[:, :, 3] >= 40
            holes = ndimage.binary_fill_holes(mask) & ~mask
            if not holes.any():
                continue
            ys, xs = np.nonzero(mask)
            top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            template = frame[top:bottom, left:right, :3].copy()
            match_mask = (mask[top:bottom, left:right] * 255).astype(np.uint8)
            result = cv2.matchTemplate(region[:, :, :3], template, cv2.TM_SQDIFF_NORMED, mask=match_mask)
            error, _, (mx, my), _ = cv2.minMaxLoc(result)
            if not np.isfinite(error) or error > 0.002:
                raise ValueError(f'Cannot safely register source for cat/{clip}/{index}: {error}')
            hy, hx = np.nonzero(holes)
            sy, sx = hy - top + my + y0, hx - left + mx + x0
            original = source[sy, sx].copy()
            valid = original[:, 3] >= 40
            frame[hy[valid], hx[valid]] = original[valid]
            recovered += int(valid.sum())
        pending.append((path, strip))
    for path, strip in pending:
        Image.fromarray(strip).save(path)
    print(f'Recovered {recovered} cat pixels from the original RGBA source')


def align_seal():
    path = ROOT / 'assets/sprites/seal/walk_down.png'
    strip = np.array(Image.open(path))
    output = np.zeros_like(strip)
    for index in range(strip.shape[1] // 160):
        frame = strip[:, index * 160:(index + 1) * 160]
        labels, _ = ndimage.label(frame[:, :, 3] >= 40)
        sizes = np.bincount(labels.ravel()); sizes[0] = 0
        body = labels == sizes.argmax()
        ys, xs = np.nonzero(body)
        dy = 153 - ys.max()
        output[ys + dy, xs + index * 160] = frame[ys, xs]
    Image.fromarray(output).save(path)
    print('Cleaned seal walk_down fragments and aligned the eight ground anchors')


if __name__ == '__main__':
    restore_cat()
    align_seal()
