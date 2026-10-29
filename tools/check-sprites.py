"""Validate every production animation strip, including per-frame alpha quality.

python tools/check-sprites.py [--report path.json]
Requires Pillow, numpy and scipy
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
CLIPS = ['idle', 'blink', 'walk_right', 'walk_left', 'walk_down', 'walk_up',
         'run_right', 'run_left', 'sit', 'lay', 'sleep', 'jump', 'hit']
# Intentional gaps between tail/torso or bird feet, confirmed against source
# RGBA drawings. Face/torso holes outside these small regions are rejected.
NATURAL_CUTOUTS = {
    'cat': {'idle': (90, 106, 101, 126), 'blink': (94, 113, 107, 133),
            'sit': (87, 111, 97, 127), 'lay': (89, 100, 105, 114),
            'hit': (90, 116, 97, 126)},
    'crow': {'jump': (66, 139, 88, 150)},
}


def check():
    counts = json.loads((ROOT / 'assets/sprites/counts.json').read_text())
    issues = []
    frames_checked = 0
    strips_checked = 0
    for species, clips in counts.items():
        if set(clips) != set(CLIPS):
            issues.append({'species': species, 'problem': 'missing or unknown clips'})
        for clip, count in clips.items():
            path = ROOT / 'assets/sprites' / species / f'{clip}.png'
            if not path.exists():
                issues.append({'species': species, 'clip': clip, 'problem': 'missing strip'})
                continue
            image = Image.open(path)
            strips_checked += 1
            if image.mode != 'RGBA' or image.size != (160 * count, 160):
                issues.append({'species': species, 'clip': clip, 'problem': 'invalid dimensions or alpha'})
                continue
            data = np.array(image)
            for index in range(count):
                frame = data[:, index * 160:(index + 1) * 160]
                mask = frame[:, :, 3] >= 40
                frames_checked += 1
                prefix = {'species': species, 'clip': clip, 'frame': index}
                if mask.sum() < 500:
                    issues.append({**prefix, 'problem': 'empty or incomplete body'})
                    continue
                if mask[:3].any() or mask[-3:].any() or mask[:, :3].any() or mask[:, -3:].any():
                    issues.append({**prefix, 'problem': 'body touches cell edge'})
                labels, _ = ndimage.label(mask)
                sizes = np.bincount(labels.ravel())
                sizes[0] = 0
                body = labels == sizes.argmax()
                holes = ndimage.binary_fill_holes(body) & ~mask
                hole_labels, _ = ndimage.label(holes)
                hole_sizes = np.bincount(hole_labels.ravel())[1:]
                for hole_id, pixels in enumerate(hole_sizes, 1):
                    if pixels <= 24:
                        continue
                    ys, xs = np.nonzero(hole_labels == hole_id)
                    allowed = NATURAL_CUTOUTS.get(species, {}).get(clip)
                    if allowed and xs.min() >= allowed[0] and ys.min() >= allowed[1] and xs.max() < allowed[2] and ys.max() < allowed[3]:
                        continue
                    issues.append({**prefix, 'problem': 'interior transparency hole', 'pixels': int(pixels)})
                pieces = sorted(sizes[1:], reverse=True)
                if len(pieces) > 1 and pieces[1] > 45:
                    issues.append({**prefix, 'problem': 'detached fragment', 'pixels': int(pieces[1])})
    return {'species': len(counts), 'strips': strips_checked, 'frames': frames_checked, 'issues': issues}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    result = check()
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    raise SystemExit(bool(result['issues']))
