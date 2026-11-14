/**
 * MihonQT Extension
 * name: MangaDex
 * pkg: all.mangadex
 * version: 1.6.4
 * code: 5
 * nsfw: 1
 * lang: all
 */

var source = {
    name: "MangaDex",
    id: 1002005,
    pkg: "all.mangadex",
    lang: "all",
    baseUrl: "https://mangadex.org",
    supportsLatest: true,

    _api: "https://api.mangadex.org",
    _cdn: "https://uploads.mangadex.org",
    // Content ratings shown by default (MIXED upstream; explicit XXX content
    // is excluded so browse stays family-friendly by default)
    _ratings: ["safe", "suggestive", "erotica"],

    // NOTE: api.mangadex.org and uploads.mangadex.org are different hosts from
    // baseUrl, so this source needs to be TRUSTED (right-click > Trust in
    // More > Extensions) or the app's network sandbox blocks every request.

    _status: function (text) {
        var t = (text || "").toLowerCase();
        if (t === "ongoing") return 1;
        if (t === "completed") return 2;
        if (t === "cancelled") return 5;
        if (t === "hiatus") return 6;
        return 0;
    },

    _firstTitle: function (titleMap) {
        if (!titleMap) return "";
        var keys = Object.keys(titleMap);
        for (var k = 0; k < keys.length; k++) {
            if (keys[k] === "en" && titleMap[keys[k]]) return titleMap[keys[k]];
        }
        return keys.length ? titleMap[keys[0]] : "";
    },

    _altTitle: function (altTitles) {
        for (var i = 0; i < altTitles.length; i++) {
            var t = altTitles[i];
            if (t && t.en) return t.en;
        }
        return "";
    },

    _coverOf: function (relationships) {
        var rels = relationships || [];
        for (var i = 0; i < rels.length; i++) {
            if (rels[i].type === "cover_art" && rels[i].attributes && rels[i].attributes.fileName) {
                return rels[i].attributes.fileName;
            }
        }
        return "";
    },

    _nameOf: function (relationships, type) {
        var rels = relationships || [];
        for (var i = 0; i < rels.length; i++) {
            if (rels[i].type === type && rels[i].attributes && rels[i].attributes.name) {
                return rels[i].attributes.name;
            }
        }
        return "";
    },

    // Common /manga list query: MDConstants limits, includes cover_art,
    // content ratings, ordered list.
    _mangaList: function (params) {
        var query = "?limit=20&includes[]=cover_art";
        for (var i = 0; i < this._ratings.length; i++) {
            query += "&contentRating[]=" + this._ratings[i];
        }
        for (var key in params) {
            if (params[key] !== undefined && params[key] !== null) {
                query += "&" + key + "=" + params[key];
            }
        }
        var url = this._api + "/manga" + query;
        console.log("MangaDex: " + url);
        var resp = Network.get(url);
        // The CDN sometimes answers the first request with an HTML
        // interstitial; the bootstrap cookies it sets let the next request
        // through (verified in testing) — retry once.
        if (typeof resp === "string" && resp.indexOf("<!doctype") === 0) {
            console.log("MangaDex: got an HTML interstitial, retrying once");
            resp = Network.get(url);
        }
        if (!resp || typeof resp !== "object" || resp.error || !resp.data) {
            var detail = resp === undefined ? "undefined" : typeof resp;
            if (detail === "object") detail = resp.error ? ("error: " + resp.error) : ("keys: " + Object.keys(resp).join(","));
            if (typeof resp === "string") detail = "string len=" + resp.length + " body=" + resp.substring(0, 1500);
            console.log("MangaDex: list request failed (" + detail + ")");
            return [];
        }
        var out = [];
        for (var i = 0; i < resp.data.length; i++) {
            var d = resp.data[i];
            var attrs = d.attributes || {};
            var title = this._firstTitle(attrs.title) || this._altTitle(attrs.altTitles || []);
            if (!title) continue;
            var cover = this._coverOf(d.relationships);
            out.push({
                url: "/manga/" + d.id,
                title: title,
                thumbnail_url: cover ? this._cdn + "/covers/" + d.id + "/" + cover + ".256.jpg" : "",
                status: this._status(attrs.status),
                initialized: false
            });
        }
        return out;
    },

    // Popular: order[followedCount]=desc, has available chapters (MDConstants)
    getPopularManga: function (page) {
        page = page || 1;
        var offset = (page - 1) * 20;
        return this._mangaList({
            "order[followedCount]": "desc",
            "hasAvailableChapters": "true",
            "offset": offset
        });
    },

    // Latest: order[latestUploadedChapter]=desc (single /manga query instead
    // of the Kotlin chapter-endpoint + manga-batch two-step)
    getLatestUpdates: function (page) {
        page = page || 1;
        var offset = (page - 1) * 20;
        return this._mangaList({
            "order[latestUploadedChapter]": "desc",
            "hasAvailableChapters": "true",
            "offset": offset
        });
    },

    getSearchManga: function (query) {
        return this._mangaList({ "title": encodeURIComponent(query || "") });
    },

    getMangaDetails: function (id, url) {
        var m = String(url).match(/\/manga\/([0-9a-f-]{36})/i);
        if (!m) return { url: url, initialized: true };
        var api = this._api + "/manga/" + m[1] + "?includes[]=author&includes[]=artist&includes[]=cover_art";
        console.log("MangaDex: details " + api);
        var resp = Network.get(api);
        var manga = { url: url, initialized: true };
        if (!resp || typeof resp !== "object" || resp.error || !resp.data) return manga;
        var attrs = resp.data.attributes || {};
        var title = this._firstTitle(attrs.title) || this._altTitle(attrs.altTitles || []);
        if (title) manga.title = title;

        var cover = this._coverOf(resp.data.relationships);
        if (cover) manga.thumbnail_url = this._cdn + "/covers/" + resp.data.id + "/" + cover + ".256.jpg";

        var desc = "";
        var descMap = attrs.description || {};
        desc = descMap.en || this._firstTitle(descMap) || "";
        // strip lightweight markdown (links, bold, italics, --- separators)
        desc = desc.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1");
        desc = desc.replace(/\*\*/g, "").replace(/(^|\n)---+(\n|$)/g, "$1$2");
        if (desc) manga.description = desc;

        var tags = attrs.tags || [];
        var tagNames = [];
        for (var i = 0; i < tags.length; i++) {
            if (tags[i] && tags[i].attributes && tags[i].attributes.name) tagNames.push(tags[i].attributes.name.en || tags[i].attributes.name["ja-ro"] || Object.keys(tags[i].attributes.name || {})[0] || "");
        }
        if (tagNames.length) manga.genre = tagNames.join(", ");

        manga.status = this._status(attrs.status);
        return manga;
    },

    getChapterList: function (id, url) {
        var m = String(url).match(/\/manga\/([0-9a-f-]{36})/i);
        if (!m) return [];
        var query = "?limit=500&order[chapter]=desc&includeFuturePublishAt=0" +
            "&includeEmptyPages=0&includeUnavailable=0";
        for (var i = 0; i < this._ratings.length; i++) {
            query += "&contentRating[]=" + this._ratings[i];
        }
        var api = this._api + "/manga/" + m[1] + "/feed" + query;
        console.log("MangaDex: feed " + api);
        var resp = Network.get(api);
        if (!resp || typeof resp !== "object" || resp.error || !resp.data) {
            console.log("MangaDex: feed request failed");
            return [];
        }
        var out = [];
        for (var i = 0; i < resp.data.length; i++) {
            var c = resp.data[i];
            var attrs = c.attributes || {};
            if (attrs.isInvalid) continue;
            var vol = attrs.volume;
            var chap = attrs.chapter;
            var title = attrs.title || "";
            var name = "";
            if (vol !== null && vol !== undefined && vol !== "") name += "Vol." + vol + " ";
            if (chap !== null && chap !== undefined && chap !== "") name += "Ch." + chap + " ";
            if (title) name += "- " + title;
            name = name.trim();
            if (!name) name = "Oneshot";

            var dateUpload = attrs.publishAt ? Date.parse(attrs.publishAt) : Date.now();
            if (isNaN(dateUpload)) dateUpload = Date.now();

            var num = 0;
            if (chap !== null && chap !== undefined && chap !== "") {
                num = parseFloat(chap);
                if (isNaN(num)) num = 0;
            }

            out.push({
                url: "/chapter/" + c.id,
                name: name,
                dateUpload: dateUpload,
                chapterNumber: num,
                scanlator: this._nameOf(c.relationships, "scanlation_group") || this._nameOf(c.relationships, "user") || "MangaDex"
            });
        }
        return out;
    },

    // at-home/server returns {baseUrl, chapter: {hash, data[]}}
    getPageList: function (chapterId, url) {
        var m = String(url).match(/\/chapter\/([0-9a-f-]{36})/i);
        if (!m) return [];
        var api = this._api + "/at-home/server/" + m[1];
        console.log("MangaDex: at-home " + api);
        var resp = Network.get(api);
        if (!resp || typeof resp !== "object" || resp.error || !resp.chapter || !resp.chapter.data) {
            console.log("MangaDex: at-home request failed");
            return [];
        }
        var base = resp.baseUrl || "https://uploads.mangadex.org";
        var out = [];
        var files = resp.chapter.data || [];
        for (var i = 0; i < files.length; i++) {
            out.push(base + "/data/" + resp.chapter.hash + "/" + files[i]);
        }
        return out;
    }
};
