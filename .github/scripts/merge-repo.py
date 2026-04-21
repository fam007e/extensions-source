import html
import sys
import json
from pathlib import Path
import shutil

# REMOTE_REPO is the 'repo' branch
REMOTE_REPO: Path = Path.cwd()
# MAIN_DIR is the root of the 'main' branch checkout
MAIN_DIR: Path = REMOTE_REPO.parent.joinpath("main")
# BUILT_REPO is where create-repo.py puts the new APKs
BUILT_REPO: Path = MAIN_DIR.joinpath("repo")
# METADATA_DIR is where the user's template files are
METADATA_DIR: Path = MAIN_DIR.joinpath("extensions")

to_delete: list[str] = json.loads(sys.argv[1])

# 1. Clean up old versions of modified extensions from the repo branch
for module in to_delete:
    apk_name = f"tachiyomi-{module}-v*.*.*.apk"
    icon_name = f"eu.kanade.tachiyomi.extension.{module}.png"
    for file in REMOTE_REPO.joinpath("apk").glob(apk_name):
        print(f"Deleting old APK: {file.name}")
        file.unlink(missing_ok=True)
    for file in REMOTE_REPO.joinpath("icon").glob(icon_name):
        print(f"Deleting old icon: {file.name}")
        file.unlink(missing_ok=True)

# 2. Copy fresh APKs and Icons from the build output
if BUILT_REPO.joinpath("apk").exists():
    shutil.copytree(src=BUILT_REPO.joinpath("apk"), dst=REMOTE_REPO.joinpath("apk"), dirs_exist_ok=True)
if BUILT_REPO.joinpath("icon").exists():
    shutil.copytree(src=BUILT_REPO.joinpath("icon"), dst=REMOTE_REPO.joinpath("icon"), dirs_exist_ok=True)

# 3. Copy metadata templates from main/extensions
for meta_file in ["repo.json", "README.md"]:
    src_file = METADATA_DIR.joinpath(meta_file)
    if src_file.exists():
        shutil.copy2(src_file, REMOTE_REPO.joinpath(meta_file))

# 4. Merge the new index with the existing repository index
remote_index_file_path = REMOTE_REPO.joinpath("index.json")
if remote_index_file_path.exists():
    with remote_index_file_path.open() as remote_index_file:
        index = json.load(remote_index_file)
else:
    index = []

local_index_file_path = BUILT_REPO.joinpath("index.min.json")
if local_index_file_path.exists():
    with local_index_file_path.open() as local_index_file:
        local_index = json.load(local_index_file)
else:
    local_index = []

# Filter out old entries for updated modules
index = [
    item for item in index
    if not any([item["pkg"].endswith(f".{module}") for module in to_delete])
]
index.extend(local_index)
index.sort(key=lambda x: x["pkg"])

# 5. Save the updated index files
with REMOTE_REPO.joinpath("index.json").open("w", encoding="utf-8") as index_file:
    json.dump(index, index_file, ensure_ascii=False, indent=2)

for item in index:
    for source in item["sources"]:
        source.pop("versionId", None)

with REMOTE_REPO.joinpath("index.min.json").open("w", encoding="utf-8") as index_min_file:
    json.dump(index, index_min_file, ensure_ascii=False, separators=(",", ":"))

# 6. Regenerate index.html listing
with REMOTE_REPO.joinpath("index.html").open("w", encoding="utf-8") as index_html_file:
    index_html_file.write('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>fam007e Extensions</title>\n</head>\n<body>\n<h1>fam007e Extensions</h1>\n<pre>\n')
    for entry in index:
        apk_escaped = 'apk/' + html.escape(entry["apk"])
        name_escaped = html.escape(entry["name"])
        index_html_file.write(f'<a href="{apk_escaped}">{name_escaped}</a>\n')
    index_html_file.write('</pre>\n</body>\n</html>\n')
