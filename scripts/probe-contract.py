# scripts/probe-contract.py
"""ยิง API จริงหลังแปลง แล้วเทียบกับ golden snapshot ที่เก็บไว้ก่อนแก้

ใช้:  CARMEN_TOKEN=$(cat /path/to/token) python3 scripts/probe-contract.py
      python3 scripts/probe-contract.py <baseline-dir>   # ถ้าจะใช้ชุดอื่น

snapshot ชุดที่ commit ไว้อยู่ที่ scripts/contract-baseline/ — ถ่ายไว้ "ก่อน" แปลง contract
จาก flat เป็น object ห้ามอัปเดตทับด้วย response หลังแปลง ไม่งั้นตาข่ายนี้จะวัดอะไรไม่ได้เลย

token ไม่อยู่ในรีโปโดยตั้งใจ — มันเป็น access token จริงของ DB dev ที่ใช้ร่วมกัน
ส่งผ่าน env CARMEN_TOKEN เท่านั้น
"""
import json, os, pathlib, subprocess, sys

BASE_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else
                        pathlib.Path(__file__).parent / 'contract-baseline')
TOKEN = os.environ.get('CARMEN_TOKEN', '').strip()
if not TOKEN:
    legacy = BASE_DIR / 'token.txt'
    if legacy.exists():
        TOKEN = legacy.read_text().strip()
if not TOKEN:
    sys.exit('ต้องตั้ง CARMEN_TOKEN ก่อน — ดู docstring ด้านบน')
APPID = '9c83fd4b-ce3f-4de2-a522-349ad1280b10'
SUFFIXES = ('id', 'name', 'local_name', 'code', 'symbol')
ALLOW = {'created_by', 'updated_by', 'deleted_by', 'po', 'pr', 'grn', 'sr', 'si', 'so',
         'cn', 'invoice', 'tax_invoice', 'sequence', 'doc'}
OPAQUE = ('audit', 'info', 'user_action', 'last_action', 'stages_status')


def flatten(node, out=None, prefix=''):
    """คลี่ object กลับเป็น flat เพื่อเทียบกับ baseline ที่ยังเป็น flat

    เก็บทุก scalar leaf ตาม path เต็ม (รวมของที่อยู่ใน dict ที่เป็น OPAQUE และของที่ซ้อน
    หลายชั้น) แล้วเสริม alias รูป <base>_<key> ให้กับ dict ที่ไม่ใช่ OPAQUE ด้วย เพื่อให้
    baseline แบบ flat เดิม (vendor_id / vendor_name) เทียบค่ากับหลังแปลงที่เป็น
    vendor: {id, name} ได้ตรงกัน — OPAQUE มีผลแค่กับ alias นี้ (และกับ leftover_flat() ที่
    ไม่ถือ dict พวกนี้เป็น entity reference) ห้ามใช้ตัดการเทียบค่าข้างในออกไปทั้งดุ้น
    list ระดับบนสุด (เช่น data ของ *.list.json) ก็ต้องเดินด้วย ไม่งั้น flatten() จะ
    คืนค่าว่างเสมอสำหรับทุก endpoint แบบ list
    """
    if out is None:
        out = {}
    if isinstance(node, dict):
        for k, v in node.items():
            if k == '_url':
                continue
            path = f'{prefix}{k}'
            if isinstance(v, dict):
                flatten(v, out, f'{path}.')
                if k not in OPAQUE:
                    for kk, vv in v.items():
                        if not isinstance(vv, (dict, list)):
                            out[f'{path}_{kk}'] = vv
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    flatten(item, out, f'{path}[{i}].')
            else:
                out[path] = v
    elif isinstance(node, list):
        for i, item in enumerate(node):
            flatten(item, out, f'{prefix}[{i}].')
    return out


def reconcile_null_refs(fb, fa):
    """<base>_<suffix> ที่เป็น null ใน baseline (fb) ต้องถือว่า "ตรงกัน" กับฝั่ง live (fa)
    ถ้า reference นั้นบนฝั่ง live ก็ null อยู่ดี (ยุบเป็น `<base>: null` หรือหาย key
    `<base>` ไปทั้งก้อนเพราะไม่มี reference ให้ resolve ตั้งแต่ต้น) — สังเคราะห์
    fa[k] = None ให้ตรงกับ fb[k] เพื่อไม่ให้ขึ้น false positive

    สำคัญ: เงื่อนไขนี้ทำงานเฉพาะตอนค่า baseline เป็น None เท่านั้น (`if v is not None:
    continue`) ถ้า baseline มีค่าจริง (เช่น `credit_term_id: 'abc'`) ฟังก์ชันนี้จะไม่แตะ
    เลย ปล่อยให้ตกไปเทียบตามปกติ — เพื่อให้ reference ที่หลุดจริง (มีค่าจริงใน baseline
    แต่ live กลับเป็น null หรือหาย key ไปทั้งก้อน) ยังโดนจับเป็น missing/changed เหมือนเดิม
    ไม่ special-case ชื่อ field หรือ endpoint ใด ๆ ใช้ SUFFIXES ชุดเดียวกับ leftover_flat()
    """
    for k, v in fb.items():
        if v is not None or k in fa:
            continue
        for s in SUFFIXES:
            suf = f'_{s}'
            if k.endswith(suf):
                base = k[: -len(suf)]
                if fa.get(base, None) is None:
                    fa[k] = None


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
SNAP_DIR = BASE_DIR / 'api' if (BASE_DIR / 'api').is_dir() else BASE_DIR
for snap in sorted(SNAP_DIR.glob('*.json')):
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
    reconcile_null_refs(fb, fa)
    # ค่าที่ถูกลบออกตอน commit snapshot (token จริง) เทียบไม่ได้โดยตั้งใจ
    changed = [f'{k}: {v!r} → {fa[k]!r}' for k, v in fb.items()
               if k in fa and fa[k] != v and v != 'REDACTED']
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
