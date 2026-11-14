# MihonQT JavaScript sources

JS-format manga sources for the [MihonQT](https://github.com/fam007e/mihonQT)
desktop app. CI (`.github/workflows/build_js_repo.yml`) builds this directory
into the **`repo-qt`** branch, which users add to the app via
*More > Extensions > Add repo*:

```
https://raw.githubusercontent.com/fam007e/extensions-source/repo-qt
```

## Layout

```
js/
  lib/      shared theme templates (inlined at build time, never installed)
  <lang>/   site sources, one directory per language (en, all, ...)
  icons/    optional icons, named <pkg>.png
  tools/    build script
```

## Authoring a source

Every site file needs a `MihonQT Extension` metadata header, then a global
`var source = { ... }`:

```js
/**
 * MihonQT Extension
 * name: Example
 * pkg: en.example
 * version: 1.0.0
 * code: 1
 * nsfw: 0
 * template: madara       (optional — see js/lib/)
 */

var source = {
    name: "Example",       // must match the header
    id: 1002010,           // unique numeric id (< 2^53)
    pkg: "en.example",
    lang: "en",
    baseUrl: "https://example.com",
    supportsLatest: true,

    getPopularManga: function (page) { ... },
    getLatestUpdates: function (page) { ... },
    getSearchManga: function (query) { ... },
    getMangaDetails: function (id, url) { ... },
    getChapterList: function (id, url) { ... },
    getPageList: function (chapterId, url) { ... }
};
```

Runtime globals provided by the app: `Network.get(url)` / `Network.post(url,
body)` (JSON responses are auto-parsed, errors come back as `{error: ...}`),
`Html.parse(html).select(css)` (Gumbo + CSS selectors, no absolute-URL
resolution — resolve relative hrefs against `baseUrl` yourself), and
`console.log`.

Return shapes: manga arrays of `{url, title, thumbnail_url, ...}`
(`status`: 0 unknown / 1 ongoing / 2 completed / 5 cancelled / 6 hiatus),
chapters of `{url, name, dateUpload, chapterNumber, scanlator}`, pages as an
array of URL strings.

Shared themes live in `js/lib/` and are inlined **before** the site file at
build time (the JS engine has no `require`), so the installed `apk/<pkg>.js`
is always self-contained. Keep templates free of site specifics.

## Build locally

```
python js/tools/build_js_repo.py --out build-qt-repo
node --check build-qt-repo/apk/en.toonily.js
```

`version`/`code` mirror the site's published Android extension version from
this repo (e.g. toonily 1.6.77 / code 77) so the JS port can be traced back
to the Kotlin implementation it was ported from.
