# scripts/probe-contract.py
"""ยิง API จริงหลังแปลง แล้วเทียบกับ golden snapshot ที่เก็บไว้ก่อนแก้
ใช้: python3 scripts/probe-contract.py /tmp/carmen-contract-baseline
"""
import json, pathlib, subprocess, sys

BASE_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/carmen-contract-baseline')
TOKEN = (BASE_DIR / 'token.txt').read_text().strip()
APPID = '9c83fd4b-ce3f-4de2-a522-349ad1280b10'
SUFFIXES = ('id', 'name', 'local_name', 'code', 'symbol')
ALLOW = {'created_by', 'updated_by', 'deleted_by', 'po', 'pr', 'grn', 'sr', 'si', 'so',
         'cn', 'invoice', 'tax_invoice', 'sequence', 'doc'}
OPAQUE = ('audit', 'info', 'user_action', 'last_action', 'stages_status')


def flatten(node, out=None, prefix=''):
    """คลี่ object กลับเป็น flat เพื่อเทียบกับ baseline ที่ยังเป็น flat"""
    if out is None:
        out = {}
    if isinstance(node, dict):
        for k, v in node.items():
            if k == '_url':
                continue
            if isinstance(v, dict) and k not in OPAQUE:
                for kk, vv in v.items():
                    if not isinstance(vv, (dict, list)):
                        out[f'{prefix}{k}_{kk}'] = vv
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    flatten(item, out, f'{prefix}{k}[{i}].')
            elif not isinstance(v, dict):
                out[f'{prefix}{k}'] = v
    return out


def leftover_flat(node, path=''):
    """หาคีย์ flat ที่ยังไม่ถูกแปลง"""
    bad = []
    if isinstance(node, dict):
        groups = {}
        for k in node:
            for s in SUFFIXES:
                if k.endswith(f'_{s}'):
                    groups.setdefault(k[: -(len(s) + 1)], []).append(s)
        for base, keys in groups.items():
            if 'id' in keys and base not in ALLOW:
                bad.append(f'{path}{base}_{{{",".join(keys)}}}')
        for k, v in node.items():
            bad += leftover_flat(v, f'{path}{k}.')
    elif isinstance(node, list):
        for item in node[:1]:
            bad += leftover_flat(item, f'{path}[].')
    return bad


fail = 0
for snap in sorted((BASE_DIR / 'api').glob('*.json')):
    before = json.loads(snap.read_text())
    url = before.get('_url')
    if not url:
        print(f'⚠️  {snap.name}: ไม่มี _url ข้าม')
        continue

    raw = subprocess.run(['curl', '-s', f'http://localhost:4000{url}',
                          '-H', f'Authorization: Bearer {TOKEN}',
                          '-H', f'x-app-id: {APPID}'],
                         capture_output=True, text=True).stdout
    after = json.loads(raw)

    problems = []
    left = leftover_flat(after.get('data'))
    if left:
        problems.append(('ยังมี flat หลงเหลือ', left[:10]))

    fb, fa = flatten(before.get('data')), flatten(after.get('data'))
    changed = [f'{k}: {v!r} → {fa[k]!r}' for k, v in fb.items() if k in fa and fa[k] != v]
    missing = [f'หายไป: {k}' for k in fb if k not in fa]
    if changed or missing:
        problems.append(('ค่าไม่ตรง baseline', (changed + missing)[:10]))

    if problems:
        fail += 1
        print(f'❌ {snap.name}')
        for title, items in problems:
            print(f'    {title}:')
            for it in items:
                print(f'      {it}')
    else:
        print(f'✅ {snap.name}')

sys.exit(1 if fail else 0)
