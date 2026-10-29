"""Local visual QA contact sheets (outputs go outside the source tree)."""
import tempfile
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
names = ['idle', 'blink', 'walk_right', 'walk_left', 'walk_down', 'walk_up',
         'run_right', 'run_left', 'sit', 'lay', 'sleep', 'jump', 'hit']
parser = argparse.ArgumentParser()
parser.add_argument('species', nargs='*')
args = parser.parse_args()
counts = json.loads((root / 'assets/sprites/counts.json').read_text())
for species in args.species or counts:
    out = Image.new('RGBA', (1320, 1430), (45, 95, 57, 255))
    draw = ImageDraw.Draw(out)
    for i, name in enumerate(names):
        im = Image.open(root / 'assets' / 'sprites' / species / f'{name}.png')
        im = im.resize((im.width * 100 // 160, 100))
        out.alpha_composite(im, (100, i * 110))
        draw.text((4, i * 110 + 6), name, fill='white')
    path = Path(tempfile.gettempdir()) / f'kuro-{species}-check.png'
    out.save(path)
    print(path)
