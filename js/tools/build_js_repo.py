#!/usr/bin/env python3
"""Build the MihonQT JS extension repo.

Scans js/<lang>/*.js for MihonQT extension headers, inlines shared templates
from js/lib/, validates uniqueness constraints, and emits the layout the
MihonQT app consumes from the `repo-qt` branch:

    index.min.json      JSON array of {name, pkg, apk, lang, code, version, nsfw}
    apk/<pkg>.js        self-contained extension scripts
    icon/<pkg>.png      optional icons (from js/icons/<pkg>.png)

Usage: python js/tools/build_js_repo.py [--out DIR] [--force]
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # the js/ directory
RESERVED_DIRS = {"lib", "tools", "icons"}

HEADER_RE = re.compile(r"/\*\*\s*(.*?)\*/", re.S)
HEADER_KEY_RE = re.compile(r"^\s*\*?\s*(name|pkg|version|code|nsfw|lang|template):\s*(.+)$", re.M)
ID_RE = re.compile(r"\bid:\s*(\d+)\b")
NAME_RE = re.compile(r"\bname:\s*\"([^\"]+)\"")


def parse_header(text: str, path: Path) -> dict:
    m = HEADER_RE.search(text)
    if not m or "MihonQT Extension" not in m.group(1):
        raise SystemExit(f"{path}: missing 'MihonQT Extension' metadata header")
    meta = {}
    for match in HEADER_KEY_RE.finditer(m.group(1)):
        meta[match.group(1)] = match.group(2).strip()
    return meta


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="build-qt-repo",
                    help="output directory (default: build-qt-repo)")
    ap.add_argument("--force", action="store_true",
                    help="remove an existing output directory first")
    args = ap.parse_args()

    out = Path(args.out).resolve()
    if out.exists():
        if not args.force:
            raise SystemExit(f"{out} already exists (use --force to rebuild)")
        shutil.rmtree(out)

    entries = []
    seen_pkgs: set = set()
    seen_ids: set = set()
    files_seen = 0

    for lang_dir in sorted(p for p in ROOT.iterdir() if p.is_dir()):
        if lang_dir.name in RESERVED_DIRS or lang_dir.name.startswith("."):
            continue
        lang = lang_dir.name
        for f in sorted(lang_dir.glob("*.js")):
            files_seen += 1
            text = f.read_text(encoding="utf-8")
            meta = parse_header(text, f)

            pkg = meta.get("pkg")
            name = meta.get("name")
            version = meta.get("version")
            code = meta.get("code")
            nsfw = meta.get("nsfw", "0")
            lang_override = meta.get("lang")

            for field, value in (("pkg", pkg), ("name", name), ("version", version), ("code", code)):
                if not value:
                    raise SystemExit(f"{f}: missing required header field '{field}'")
            if nsfw not in ("0", "1"):
                raise SystemExit(f"{f}: nsfw must be 0 or 1")
            if pkg in seen_pkgs:
                raise SystemExit(f"{f}: duplicate pkg '{pkg}'")

            body = text
            if meta.get("template"):
                tpl_path = ROOT / "lib" / f"{meta['template']}.js"
                if not tpl_path.exists():
                    raise SystemExit(f"{f}: template '{meta['template']}' not found at {tpl_path}")
                body = tpl_path.read_text(encoding="utf-8") + "\n\n" + text

            id_match = ID_RE.search(body)
            if not id_match:
                raise SystemExit(f"{f}: no numeric source id found (need `id: <int>` in the source object)")
            src_id = id_match.group(1)
            if src_id in seen_ids:
                raise SystemExit(f"{f}: duplicate source id {src_id}")
            seen_ids.add(src_id)

            # The runtime `name:` in the source object must match the header
            name_in_body = NAME_RE.search(body)
            if not name_in_body or name_in_body.group(1) != name:
                raise SystemExit(
                    f"{f}: header name '{name}' does not match the source object's name "
                    f"({name_in_body.group(1) if name_in_body else 'missing'})"
                )

            (out / "apk").mkdir(parents=True, exist_ok=True)
            (out / "apk" / f"{pkg}.js").write_text(body, encoding="utf-8")

            # MihonQT constructs icon URLs as <repo>/icon/<pkg>.png
            icon = ROOT / "icons" / f"{pkg}.png"
            if icon.exists():
                (out / "icon").mkdir(parents=True, exist_ok=True)
                shutil.copy(icon, out / "icon" / f"{pkg}.png")

            entries.append({
                "name": name,
                "pkg": pkg,
                "apk": f"{pkg}.js",
                "lang": lang_override or lang,
                "code": int(code),
                "version": version,
                "nsfw": int(nsfw),
            })
            seen_pkgs.add(pkg)

    if not entries:
        raise SystemExit("no MihonQT extensions found under js/<lang>/")

    index_path = out / "index.min.json"
    index_path.write_text(
        json.dumps(entries, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"built {len(entries)} extensions ({files_seen} files scanned) -> {index_path}")
    for e in entries:
        print(f"  {e['lang']:6} {e['pkg']:16} v{e['version']} (code {e['code']}) nsfw={e['nsfw']}")


if __name__ == "__main__":
    main()
