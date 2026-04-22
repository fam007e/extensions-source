import html
import sys
import json
from pathlib import Path
import re
import shutil

from google.protobuf import json_format

import index_pb2

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
REMOTE_REPO.joinpath("index.json").unlink(missing_ok=True)

remote_index_file_path = REMOTE_REPO.joinpath("index.min.json")
if remote_index_file_path.exists():
    with remote_index_file_path.open() as remote_index_file:
        legacy_index = json.load(remote_index_file)
else:
    legacy_index = []

local_index_file_path = BUILT_REPO.joinpath("index.min.json")
if local_index_file_path.exists():
    with local_index_file_path.open() as local_index_file:
        local_index = json.load(local_index_file)
else:
    local_index = []

# Filter out old entries for updated modules
legacy_index = [
    item for item in legacy_index
    if not any([item["pkg"].endswith(f".{module}") for module in to_delete])
]
legacy_index.extend(local_index)
legacy_index.sort(key=lambda x: x["pkg"])

def extract_extension_lib(version: str) -> str:
    if match := re.search(r'(\d+)\.(\d+)', version):
        return f"{match.group(1)}.{match.group(2)}"

    raise ValueError(f"Version {version} doesn't contain MAJOR.MINOR")

index = index_pb2.Index(
    name = "fam007e Extensions",
    badgeLabel = "FAM",
    signingKey = "9add655a78e96c4ec7a53ef89dccb557cb5d767489fac5e785d671a5a75d4da2",
    contact=index_pb2.Contact(
        website="https://fam007e.github.io/extensions-source",
        discord="https://discord.gg/3FbCpdKbdY"
    ),
    extensions=[
        index_pb2.Extension(
            name=extension["name"].replace("Tachiyomi: ", ""),
            packageName=extension["pkg"],
            resources=index_pb2.Resources(
                apkUrl=f"https://raw.githubusercontent.com/fam007e/extensions-source/repo/apk/{extension['apk']}",
                iconUrl=f"https://raw.githubusercontent.com/fam007e/extensions-source/repo/icon/{extension['pkg']}.png",
            ),
            extensionLib=extract_extension_lib(extension["version"]),
            versionCode=extension["code"],
            versionName=extension["version"],
            sources=[
                index_pb2.Source(
                    id=int(source["id"]),
                    name=source["name"],
                    language=source["lang"],
                    homeUrl=source["baseUrl"],
                    contentRating=index_pb2.ContentRating.CONTENT_RATING_PORNOGRAPHIC if extension["nsfw"] == 1 else index_pb2.CONTENT_RATING_SAFE,
                )
                for source in extension["sources"]
            ]
        )
        for extension in legacy_index
    ]
)

# 5. Save the updated index files
with REMOTE_REPO.joinpath("index.json").open("w", encoding="utf-8") as index_file:
    index_file.write(json_format.MessageToJson(index, always_print_fields_with_no_presence=False, preserving_proto_field_name=True))

with REMOTE_REPO.joinpath("index.pb").open("wb") as index_pb_file:
    index_pb_file.write(index.SerializeToString())

with REMOTE_REPO.joinpath("index.min.json").open("w", encoding="utf-8") as index_min_file:
    json.dump(legacy_index, index_min_file, ensure_ascii=False, separators=(",", ":"))

# index.html generation removed to preserve VitePress website
