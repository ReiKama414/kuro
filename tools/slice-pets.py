"""Rebuild dog/hamster strips from the original, already alpha-matted artwork.

Run from the repository root: python tools/slice-pets.py
Requires Pillow, numpy and scipy. No colour keying: golden fur is foreground.
Panel bounds deliberately exclude headings, borders and numbered badges.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
CELL = 160
FOOT = CELL - 6

# Actual poses in each source row, rather than the sometimes incorrect labels.
# Centres also provide a fixed registration point while limbs/tails move.
DOG = {
    'idle': ((13, 44, 886, 142), [59, 155, 248, 342, 436, 534, 631, 731, 825]),
    'blink': ((910, 44, 1522, 142), [957, 1059, 1162, 1266, 1369, 1473]),
    'walk_right': ((13, 220, 764, 306), [60, 155, 251, 345, 438, 533, 626, 718]),
    'walk_left': ((780, 220, 1523, 306), [825, 918, 1011, 1104, 1196, 1288, 1380, 1473]),
    'walk_down': ((15, 378, 762, 479), [60, 155, 249, 342, 435, 527, 619, 710]),
    'walk_up': ((783, 378, 1519, 480), [826, 917, 1009, 1099, 1192, 1286, 1379, 1472]),
    'run_right': ((13, 552, 762, 638), [59, 156, 256, 348, 448, 557, 684]),
    'run_left': ((780, 552, 1523, 638), [842, 954, 1055, 1153, 1252, 1352, 1452]),
    'sit': ((13, 717, 482, 809), [53, 132, 210, 288, 366, 442]),
    'lay': ((500, 736, 999, 806), [554, 661, 772, 870, 957]),
    'sleep': ((1017, 735, 1522, 805), [1060, 1147, 1229, 1310, 1394, 1477]),
    'jump': ((13, 877, 514, 987), [57, 143, 227, 307, 389, 472]),
    'land': ((529, 883, 1008, 985), [573, 656, 739, 820, 901, 976]),
    'hit': ((1022, 879, 1523, 984), [1060, 1145, 1228, 1314, 1397, 1481]),
}

HAMSTER = {
    'idle': ((16, 43, 883, 142), [58, 155, 251, 345, 441, 537, 634, 732, 832]),
    'blink': ((916, 43, 1520, 143), [960, 1062, 1165, 1268, 1372, 1476]),
    'walk_right': ((13, 212, 762, 306), [57, 155, 251, 347, 441, 534, 627, 719]),
    'walk_left': ((778, 212, 1521, 306), [823, 914, 1007, 1100, 1194, 1287, 1382, 1476]),
    'walk_down': ((19, 380, 750, 477), [59, 154, 249, 343, 436, 528, 620, 713]),
    'walk_up': ((788, 380, 1512, 478), [825, 918, 1010, 1102, 1196, 1289, 1382, 1476]),
    'run_right': ((12, 549, 762, 639), [58, 155, 251, 345, 438, 532, 625, 716]),
    'run_left': ((780, 549, 1523, 639), [825, 920, 1014, 1106, 1198, 1291, 1384, 1478]),
    'sit': ((15, 715, 490, 809), [53, 135, 215, 294, 372, 452]),
    'lay': ((509, 730, 997, 805), [552, 641, 725, 806, 883, 960]),
    'sleep': ((1015, 727, 1525, 804), [1058, 1144, 1227, 1311, 1396, 1483]),
    'jump': ((13, 879, 513, 985), [55, 142, 225, 308, 390, 473]),
    'land': ((528, 879, 1008, 985), [568, 648, 729, 811, 891, 971]),
    'hit': ((1023, 879, 1525, 985), [1062, 1146, 1230, 1314, 1397, 1485]),
}


def seam(rgba, nominal, radius=22):
    """Follow the gap/dark outline between touching poses, including overhangs."""
    height, width = rgba.shape[:2]
    left, right = max(1, nominal - radius), min(width - 1, nominal + radius)
    pixels = rgba[:, left:right]
    alpha = pixels[:, :, 3] / 255.0
    light = np.mean(pixels[:, :, :3], axis=2) / 255.0
    # Background is cheapest; a dark outline is cheaper than the animal's fur.
    cost = alpha * (0.15 + light ** 2)
    cost += 0.015 * ((np.arange(left, right) - nominal) / radius) ** 2
    total = cost[0].copy()
    previous = np.zeros(cost.shape, dtype=np.int32)
    for y in range(1, height):
        candidates = np.stack((np.r_[np.inf, total[:-1]], total, np.r_[total[1:], np.inf]))
        direction = np.argmin(candidates, axis=0) - 1
        previous[y] = np.arange(right - left) + direction
        total = cost[y] + np.min(candidates, axis=0)
    path = np.empty(height, dtype=np.int32)
    x = int(np.argmin(total))
    for y in range(height - 1, -1, -1):
        path[y] = x + left
        x = previous[y, x]
    return path


def extract(rgba, box, centres, clip):
    x0, y0, x1, y1 = box
    region = rgba[y0:y1, x0:x1].copy()
    height, width = region.shape[:2]
    foreground = region[:, :, 3] >= 40
    # A few noses touch a coloured panel border. Restrict chrome removal to
    # the panel edges and cool UI colours, so orange fur is never keyed out.
    rgb = region[:, :, :3].astype(np.int16)
    chrome = (rgb[:, :, 2] > rgb[:, :, 0] + 20) | (rgb[:, :, 2] > rgb[:, :, 1] + 25)
    edge = np.zeros((height, width), dtype=bool)
    edge[:, :4] = True
    edge[:, -4:] = True
    edge[-4:] = True
    foreground &= ~(chrome & edge)
    edges = [np.zeros(height, dtype=int)]
    for a, b in zip(centres, centres[1:]):
        edges.append(seam(region, round((a + b) / 2) - x0))
    edges.append(np.full(height, width, dtype=int))
    columns = np.arange(width)[None, :]
    frames = []
    for i, centre in enumerate(centres):
        mask = foreground & (columns >= edges[i][:, None]) & (columns < edges[i + 1][:, None])
        labels, _ = ndimage.label(mask)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        body = int(sizes.argmax())
        # Remove isolated badge/border specks; keep only this pose's body.
        mask = labels == body
        ys, xs = np.nonzero(mask)
        if not len(xs) or sizes[body] < 1000:
            raise ValueError(f'{clip} frame {i}: missing body')
        # Register each row to its numbered frame centres, not a shifting bbox.
        dx = round(CELL / 2 - (centre - x0))
        # Shared ground within a row preserves leg motion and jump height.
        dy = FOOT - height
        tx, ty = xs + dx, ys + dy
        if np.any((tx < 4) | (tx >= CELL - 4) | (ty < 4) | (ty >= CELL - 4)):
            raise ValueError(f'{clip} frame {i}: would clip its own cell')
        frame = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        frame[ty, tx] = region[ys, xs]
        frames.append(frame)
    # Both source sheets accidentally put a rear-facing pose in WALK DOWN.
    if clip == 'walk_down':
        frames.pop()
    return frames


def rebuild(species, source, panels):
    rgba = np.array(Image.open(ROOT / source).convert('RGBA'))
    clips = {name: extract(rgba, *config, name) for name, config in panels.items()}
    if species == 'dog':
        # Several horizontal poses overlap in the source itself: a neighbour's
        # nose obscures the tail, so a cut cannot recover a complete animal.
        # Build both gaits from the intact poses and mirror them for leftwards
        # motion. Explicit holds retain the original walk/run cycle timing.
        walk = clips['walk_right']
        run = clips['run_right']
        clips['walk_right'] = [walk[0], walk[0], run[0], run[0], run[5], run[5], run[6], run[6]]
        clips['run_right'] = [run[0], run[0], run[5], run[5], run[6], run[6], run[5]]
        clips['walk_left'] = [frame[:, ::-1].copy() for frame in clips['walk_right']]
        clips['run_left'] = [frame[:, ::-1].copy() for frame in clips['run_right']]
    clips['jump'].extend(clips.pop('land'))
    output = ROOT / 'assets' / 'sprites' / species
    output.mkdir(parents=True, exist_ok=True)
    counts = {}
    for name, frames in clips.items():
        Image.fromarray(np.concatenate(frames, axis=1)).save(output / f'{name}.png')
        counts[name] = len(frames)
    return counts


if __name__ == '__main__':
    counts_path = ROOT / 'assets' / 'sprites' / 'counts.json'
    counts = json.loads(counts_path.read_text(encoding='utf-8'))
    counts['dog'] = rebuild('dog', 'uploads/sheet-a.png', DOG)
    counts['hamster'] = rebuild('hamster', 'uploads/sheet-d.png', HAMSTER)
    counts_path.write_text(json.dumps(counts, indent=2) + '\n', encoding='utf-8')
    print('Rebuilt dog and hamster sprites; updated counts.json')
