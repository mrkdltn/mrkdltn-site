"""Download and encode the media listed in media/manifest.json (run by .github/workflows/fetch-media.yml).

Videos are re-encoded for the web: H.264, no audio, fast start, CRF 27, scaled as listed.
Outputs that already exist are left alone, so the workflow is safe to re-run.
"""
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
man = json.loads((ROOT / 'media' / 'manifest.json').read_text())
made = 0
for it in man['items']:
    out = ROOT / it['out']
    if out.exists():
        continue
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.mp4') as tmp:
        req = urllib.request.Request(it['url'], headers={'User-Agent': 'mrkdltn-site media fetch'})
        with urllib.request.urlopen(req, timeout=120) as r:
            tmp.write(r.read())
        tmp.flush()
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-an', '-vf', 'scale=%s:flags=lanczos,format=yuv420p' % it['scale'],
               '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-movflags', '+faststart', str(out)]
        subprocess.run(cmd, check=True)
    print(it['out'], out.stat().st_size)
    made += 1
print('made', made)
sys.exit(0)
