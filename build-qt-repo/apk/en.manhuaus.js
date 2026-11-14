/**
 * MihonQT Template: Madara-family WordPress manga sites.
 * Not installed directly — js/tools/build_js_repo.py inlines this file
 * before the site config when a site declares `template: madara`.
 *
 * Ported from extensions-source lib-multisrc/madara (MadaraBase/MadaraNoAjax).
 * Limitations vs the Kotlin source: no admin-ajax POST browse (GET archive
 * pages are used), no chapter-protector AES decryption (encrypted chapters
 * return an empty page list), no custom request headers.
 */
function madaraTemplate(cfg) {
    var T = {
        name: cfg.name,
        id: cfg.id,
        pkg: cfg.pkg,
        lang: cfg.lang,
        baseUrl: cfg.baseUrl,
        supportsLatest: true,

        _mangaPath: cfg.mangaPath || "/manga",
        _popularOrder: cfg.popularOrder || "views",
        _latestOrder: cfg.latestOrder || "latest",
        _descSelector: cfg.descriptionSelector || "div.description-summary div.summary__content",
        _scanlator: cfg.name,

        absUrl: function (url) {
            if (!url) return "";
            url = url.trim();
            if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) return url;
            if (url.indexOf("//") === 0) return "https:" + url;
            if (url.indexOf("/") === 0) return this.baseUrl + url;
            return this.baseUrl + "/" + url;
        },

        // Madara imageFromElement attr priority (data-src, data-lazy-src, ...), srcset fallback
        imgSrc: function (el) {
            var attrs = ["data-src", "data-lazy-src", "data-lzl-src", "data-cfsrc", "data-manga-src", "src"];
            for (var i = 0; i < attrs.length; i++) {
                var v = el.attr(attrs[i]);
                if (v) return this.absUrl(v);
            }
            var srcset = el.attr("srcset");
            if (srcset) {
                var first = srcset.split(",")[0].trim().split(/\s+/)[0];
                if (first) return this.absUrl(first);
            }
            return "";
        },

        _status: function (text) {
            var t = (text || "").toLowerCase();
            if (t.indexOf("ongoing") !== -1 || t.indexOf("on-going") !== -1) return 1;
            if (t.indexOf("completed") !== -1) return 2;
            if (/\b(ended|end)\b/.test(t)) return 2;
            if (t.indexOf("cancel") !== -1 || t.indexOf("dropped") !== -1) return 5;
            if (t.indexOf("hiatus") !== -1 || t.indexOf("on hold") !== -1 || t.indexOf("paused") !== -1) return 6;
            return 0;
        },

        // Covers "March 5, 2024", "March 5, 24" (2-digit year), ISO dates,
        // "x days/hours/... ago", "today", "yesterday" — the common Madara formats.
        _date: function (raw) {
            if (!raw) return Date.now();
            var t = raw.trim().toLowerCase();
            var now = Date.now();
            if (t.indexOf("today") !== -1 || t.indexOf("now") === 0) return now;
            if (t.indexOf("yesterday") !== -1) return now - 86400000;
            var rel = t.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/);
            if (rel) {
                var ms = {
                    second: 1000, minute: 60000, hour: 3600000, day: 86400000,
                    week: 604800000, month: 2592000000, year: 31536000000
                }[rel[2]];
                return now - parseInt(rel[1], 10) * ms;
            }
            var cleaned = raw.replace(/(\d)(st|nd|rd|th)/g, "$1");
            var ts = Date.parse(cleaned);
            if (!isNaN(ts)) {
                if (ts > 0 && ts < 100 * 365.25 * 86400000) return ts + 2000 * 365.25 * 86400000;
                return ts;
            }
            var two = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{2})$/);
            if (two) {
                var ts2 = Date.parse(two[1] + " " + two[2] + ", 20" + two[3]);
                if (!isNaN(ts2)) return ts2;
            }
            return now;
        },

        _parseMangaList: function (html) {
            var doc = Html.parse(html);
            var out = [];
            var items = doc.select("div.page-item-detail");
            if (items.length === 0) items = doc.select(".manga__item");
            if (items.length === 0) items = doc.select(".c-tabs-item__content");
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var a = item.first(".post-title a");
                if (!a) continue;
                var href = this.absUrl(a.attr("href"));
                var title = a.text.trim();
                if (!title) {
                    var alt = item.first(".post-title h3") || item.first(".post-title h5");
                    title = alt ? alt.text.trim() : "";
                }
                if (!href || !title) continue;
                var img = item.first("img");
                out.push({
                    url: href,
                    title: title,
                    thumbnail_url: img ? this.imgSrc(img) : "",
                    status: 0,
                    initialized: false
                });
            }
            return out;
        },

        // MadaraNoAjax archivePage: {base}{path}/page/N/?m_orderby=<order>
        _archive: function (page, order) {
            page = page || 1;
            var url = this.baseUrl + this._mangaPath + "/";
            if (page > 1) url += "page/" + page + "/";
            url += "?m_orderby=" + order;
            console.log(this.name + ": archive " + url);
            var html = Network.get(url);
            if (!html || typeof html !== "string") return [];
            return this._parseMangaList(html);
        },

        getPopularManga: function (page) {
            return this._archive(page, this._popularOrder);
        },

        getLatestUpdates: function (page) {
            return this._archive(page, this._latestOrder);
        },

        // htmlSearch: GET ?s=<query>&post_type=wp-manga (single page, like Kotlin page>1 cutoff)
        getSearchManga: function (query) {
            var url = this.baseUrl + "/?s=" + encodeURIComponent(query) + "&post_type=wp-manga";
            console.log(this.name + ": search " + url);
            var html = Network.get(url);
            if (!html || typeof html !== "string") return [];
            return this._parseMangaList(html);
        },

        getMangaDetails: function (id, url) {
            url = this.absUrl(url);
            var html = Network.get(url);
            var manga = { url: url, initialized: true };
            if (!html || typeof html !== "string") return manga;
            var doc = Html.parse(html);

            var titleEl = doc.first("div.post-title h3") ||
                          doc.first("div.post-title h1") ||
                          doc.first("#manga-title > h1");
            if (titleEl) manga.title = titleEl.text.trim();

            var authors = doc.select("div.author-content > a");
            if (authors.length === 0) authors = doc.select("div.manga-authors > a");
            var authorNames = [];
            for (var i = 0; i < authors.length; i++) {
                var n = authors[i].text.trim();
                if (n && !/updating/i.test(n)) authorNames.push(n);
            }
            if (authorNames.length) manga.author = authorNames.join(", ");

            var artists = doc.select("div.artist-content > a");
            var artistNames = [];
            for (var j = 0; j < artists.length; j++) {
                var an = artists[j].text.trim();
                if (an && !/updating/i.test(an)) artistNames.push(an);
            }
            if (artistNames.length) manga.artist = artistNames.join(", ");

            var desc = doc.first(this._descSelector);
            if (desc) {
                var ps = desc.select("p");
                if (ps.length > 0) {
                    var parts = [];
                    for (var k = 0; k < ps.length; k++) parts.push(ps[k].text.trim());
                    manga.description = parts.join("\n\n");
                } else {
                    manga.description = desc.text.trim();
                }
            }

            var genres = doc.select("div.genres-content a");
            var genreNames = [];
            for (var g = 0; g < genres.length; g++) genreNames.push(genres[g].text.trim());
            if (genreNames.length) manga.genre = genreNames.join(", ");

            // last summary-content wins (Kotlin: select(...).lastOrNull())
            var summaries = doc.select("div.summary-content");
            if (summaries.length > 0) manga.status = this._status(summaries[summaries.length - 1].text);

            var img = doc.first("div.summary_image img");
            if (img) manga.thumbnail_url = this.imgSrc(img);

            return manga;
        },

        // ChapterMode.MangaAjax: POST {mangaUrl}/ajax/chapters/, parse li.wp-manga-chapter
        getChapterList: function (id, url) {
            url = this.absUrl(url);
            var ajaxUrl = url.replace(/\/+$/, "") + "/ajax/chapters/";
            console.log(this.name + ": chapters " + ajaxUrl);
            var html = Network.post(ajaxUrl, "");
            if (!html || typeof html !== "string") {
                console.log(this.name + ": chapter ajax failed, falling back to manga page");
                html = Network.get(url);
            }
            if (!html || typeof html !== "string") return [];

            var doc = Html.parse(html);
            var rows = doc.select("li.wp-manga-chapter");
            var out = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var a = row.first("a");
                if (!a) continue;
                var href = this.absUrl(a.attr("href"));
                var name = a.text.replace(/\s+/g, " ").trim();
                if (!href || !name) continue;

                var dateRaw = "";
                var dateEl = row.first("span.chapter-release-date");
                if (dateEl) {
                    var dt = dateEl.first("a");
                    if (dt && dt.hasAttr("title") && dt.attr("title")) {
                        dateRaw = dt.attr("title");
                    } else {
                        var imgs = dateEl.select("img");
                        for (var m = 0; m < imgs.length; m++) {
                            var alt = imgs[m].attr("alt");
                            if (alt) { dateRaw = alt; break; }
                        }
                    }
                    if (!dateRaw) dateRaw = dateEl.text;
                }

                var num = 0;
                var match = name.match(/(?:chapter|ch\.?|episode|ep\.?)\s*([\d.]+)/i);
                if (match) {
                    num = parseFloat(match[1]);
                } else {
                    var anyNum = name.match(/[\d.]+/);
                    if (anyNum) num = parseFloat(anyNum[0]);
                }
                if (isNaN(num)) num = 0;

                out.push({
                    url: href,
                    name: name,
                    dateUpload: this._date(dateRaw),
                    chapterNumber: num,
                    scanlator: this._scanlator
                });
            }
            return out;
        },

        getPageList: function (chapterId, url) {
            url = this.absUrl(url);
            console.log(this.name + ": pages " + url);
            var html = Network.get(url);
            if (!html || typeof html !== "string") return [];
            var doc = Html.parse(html);

            if (doc.first("#chapter-protector-data")) {
                console.log(this.name + ": chapter is encrypted (chapter protector), cannot extract pages");
                return [];
            }

            var containers = doc.select("div.page-break");
            if (containers.length === 0) containers = doc.select("li.blocks-gallery-item");
            if (containers.length === 0) containers = doc.select(".reading-content img");

            var out = [];
            var seen = {};
            for (var i = 0; i < containers.length; i++) {
                var el = containers[i];
                var img = el;
                if (el.tagName && el.tagName.toLowerCase() !== "img") img = el.first("img");
                if (!img) continue;
                var src = this.imgSrc(img);
                if (src && !seen[src]) {
                    seen[src] = true;
                    out.push(src);
                }
            }
            return out;
        }
    };
    return T;
}


/**
 * MihonQT Extension
 * name: ManhuaUS
 * pkg: en.manhuaus
 * version: 1.6.63
 * code: 63
 * nsfw: 0
 * template: madara
 */
var source = madaraTemplate({
    name: "ManhuaUS",
    id: 1002002,
    pkg: "en.manhuaus",
    lang: "en",
    baseUrl: "https://manhuaus.com"
    // mangaPath defaults to "/manga" (Madara default); ManhuaUS.kt only
    // overrides chapterMode (MangaAjax, which the template uses) and
    // filterNonMangaItems, neither of which changes browse URLs.
});
