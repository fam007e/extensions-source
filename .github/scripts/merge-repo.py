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

# 6. Regenerate index.html listing (Modern Dashboard)
with REMOTE_REPO.joinpath("index.html").open("w", encoding="utf-8") as index_html_file:
    index_html_file.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>fam007e Extensions</title>
    <style>
        :root {{
            --bg-color: #121212;
            --card-bg: #1e1e1e;
            --text-color: #e0e0e0;
            --accent-color: #29b6f6;
            --secondary-text: #9e9e9e;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            max-width: 800px;
        }}
        .header h1 {{ color: var(--accent-color); margin-bottom: 10px; }}
        .add-btn {{
            display: inline-block;
            background-color: var(--accent-color);
            color: black;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px 0;
            transition: opacity 0.2s;
        }}
        .add-btn:hover {{ opacity: 0.8; }}
        #search {{
            width: 100%;
            max-width: 500px;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #333;
            background: var(--card-bg);
            color: white;
            font-size: 16px;
            margin-bottom: 20px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            width: 100%;
            max-width: 1200px;
        }}
        .card {{
            background: var(--card-bg);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            transition: transform 0.2s;
            text-decoration: none;
            color: inherit;
            border: 1px solid transparent;
        }}
        .card:hover {{
            transform: translateY(-2px);
            border-color: var(--accent-color);
        }}
        .icon {{
            width: 48px;
            height: 48px;
            margin-right: 16px;
            border-radius: 8px;
            background: #333;
        }}
        .info {{ display: flex; flex-direction: column; }}
        .name {{ font-weight: bold; font-size: 15px; margin-bottom: 4px; }}
        .meta {{ font-size: 12px; color: var(--secondary-text); }}
        .lang-badge {{
            display: inline-block;
            background: #333;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 4px;
            text-transform: uppercase;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>fam007e Extensions</h1>
        <p>A personal repository of extensions for Mihon and Tachiyomi.</p>
        <a href="https://fam007e.github.io/add-repo" class="add-btn">Add to Mihon</a>
        <p class="meta">URL: <code>https://raw.githubusercontent.com/fam007e/extensions-source/repo/index.min.json</code></p>
    </div>

    <input type="text" id="search" placeholder="Search extensions..." onkeyup="filter()">

    <div class="grid" id="extension-grid">
""")
    for entry in index:
        apk_url = 'apk/' + html.escape(entry["apk"])
        name = html.escape(entry["name"].replace("Tachiyomi: ", ""))
        pkg = html.escape(entry["pkg"])
        lang = html.escape(entry["lang"])
        version = html.escape(entry["version"])
        icon_url = f"icon/{pkg}.png"
        
        index_html_file.write(f"""
        <a href="{apk_url}" class="card" data-name="{name.lower()}">
            <img src="{icon_url}" class="icon" onerror="this.src='https://mihon.app/img/logo.png'">
            <div class="info">
                <span class="name">{name}</span>
                <span class="meta">v{version}</span>
                <span class="meta"><span class="lang-badge">{lang}</span></span>
            </div>
        </a>""")
        
    index_html_file.write("""
    </div>

    <script>
        function filter() {
            let input = document.getElementById('search').value.toLowerCase();
            let cards = document.getElementsByClassName('card');
            for (let i = 0; i < cards.length; i++) {
                let name = cards[i].getAttribute('data-name');
                cards[i].style.display = name.includes(input) ? 'flex' : 'none';
            }
        }
    </script>
</body>
</html>
""")
