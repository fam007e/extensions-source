/**
 * MihonQT Extension
 * name: Webtoons.com
 * pkg: all.webtoons
 * version: 1.6.3
 * code: 4
 * nsfw: 0
 * lang: all
 */

var source = {
    name: "Webtoons.com",
    id: 1002004,
    pkg: "all.webtoons",
    lang: "all",
    baseUrl: "https://www.webtoons.com",
    supportsLatest: true,

    // Webtoons.kt: popular = the ranking pages, one rank per "page"
    _ranks: ["trending", "popular", "originals", "canvas"],

    _days: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],

    _abs: function (url) {
        if (!url) return "";
        url = url.trim();
        if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) return url;
        if (url.indexOf("//") === 0) return "https:" + url;
        if (url.indexOf("/") === 0) return this.baseUrl + url;
        return this.baseUrl + "/" + url;
    },

    // Webtoons.kt popular: https://www.webtoons.com/<lang>/ranking/<rank>
    getPopularManga: function (page) {
        page = page || 1;
        if (page > this._ranks.length) return [];
        var url = this.baseUrl + "/en/ranking/" + this._ranks[page - 1];
        console.log("Webtoons: ranking " + url);
        var html = Network.get(url);
        if (!html || typeof html !== "string") return [];
        return this._parseList(html);
    },

    // Webtoons.kt latest: originals/<day>?sortOrder=UPDATE
    getLatestUpdates: function (page) {
        page = page || 1;
        if (page > 1) return [];
        var day = this._days[new Date().getDay()];
        var url = this.baseUrl + "/en/originals/" + day + "?sortOrder=UPDATE";
        console.log("Webtoons: latest " + url);
        var html = Network.get(url);
        if (!html || typeof html !== "string") return [];
        return this._parseList(html);
    },

    // Webtoons.kt search: /search[/<type>]?keyword=<query>&page=<N>
    getSearchManga: function (query) {
        var url = this.baseUrl + "/en/search?keyword=" + encodeURIComponent(query);
        console.log("Webtoons: search " + url);
        var html = Network.get(url);
        if (!html || typeof html !== "string") return [];
        return this._parseList(html);
    },

    _parseList: function (html) {
        var doc = Html.parse(html);
        var out = [];
        var items = doc.select(".webtoon_list li");
        for (var i = 0; i < items.length; i++) {
            var li = items[i];
            var a = li.first("a");
            if (!a) continue;
            var href = a.attr("href");
            if (!href) continue;
            var title = "";
            var t = li.first(".title");
            if (t && t.text.trim()) {
                title = t.text.trim();
            } else {
                title = a.text.trim();
            }
            var thumb = "";
            var img = li.first("img");
            if (img) thumb = img.attr("src") || "";
            out.push({
                url: this._abs(href),
                title: title,
                thumbnail_url: thumb,
                status: 0,
                initialized: false
            });
        }
        return out;
    },

    // Series URLs use title_no=<n>; the path is /en/<genre>/<slug>/list —
    // do NOT anchor on a /webtoon|canvas/ segment, genre paths don't have it.
    _titleInfo: function (url) {
        var m = url.match(/title_no=(\d+)/i);
        if (m) return { type: url.indexOf("/canvas/") !== -1 ? "canvas" : "webtoon", id: m[1] };
        m = url.match(/titleId=(\d+)/);
        if (m) {
            var type = url.indexOf("/canvas/") !== -1 ? "canvas" : "webtoon";
            return { type: type, id: m[1] };
        }
        console.log("Webtoons: could not extract title id from " + url);
        return null;
    },

    getMangaDetails: function (id, url) {
        url = this._abs(url);
        var html = Network.get(url);
        var manga = { url: url, initialized: true };
        if (!html || typeof html !== "string") return manga;
        var doc = Html.parse(html);

        var t = doc.first("h1.subj") || doc.first("h3.subj");
        if (t) manga.title = t.text.trim();

        var authorArea = doc.first(".author_area");
        if (authorArea) {
            manga.author = authorArea.text.replace(/^author\s*/i, "").trim();
        }

        var genres = doc.select(".genre");
        var genreNames = [];
        for (var i = 0; i < genres.length; i++) genreNames.push(genres[i].text.trim());
        if (genreNames.length) manga.genre = genreNames.join(", ");

        var summary = doc.first("p.summary");
        if (summary) manga.description = summary.text.trim();

        var dayInfo = doc.first("p.day_info");
        if (dayInfo) {
            var dt = dayInfo.text.toUpperCase();
            if (dt.indexOf("UP") !== -1 || dt.indexOf("EVERY") !== -1) manga.status = 1;
            else if (dt.indexOf("END") !== -1 || dt.indexOf("COMPLETED") !== -1) manga.status = 2;
            else manga.status = 1;
        }

        var meta = doc.select("meta[property='og:image']");
        if (meta.length > 0) {
            var og = meta[0].attr("content");
            if (og) manga.thumbnail_url = og;
        }
        return manga;
    },

    // Webtoons.kt episodes endpoint: m.webtoons.com JSON API
    _episodesFromApi: function (info) {
        var api = "https://m.webtoons.com/api/v1/" + info.type + "/" + info.id +
            "/episodes?pageSize=99999";
        if (info.type === "canvas") api += "&readingLanguageCode=en";
        var resp = Network.get(api);
        if (!resp || typeof resp !== "object" || resp.error) return null;
        if (!resp.result || !resp.result.episodeList) return null;
        return resp.result.episodeList;
    },

    // Fallback: paginate the series page's episode list
    _episodesFromHtml: function (url) {
        var out = [];
        var page = 1;
        while (page <= 30) {
            var pageUrl = url + (url.indexOf("?") !== -1 ? "&" : "?") + "page=" + page;
            var html = Network.get(pageUrl);
            if (!html || typeof html !== "string") break;
            var doc = Html.parse(html);
            var items = doc.select("#_episodeList li");
            if (items.length === 0) items = doc.select(".detail_episode-list li");
            if (items.length === 0) break;
            for (var i = 0; i < items.length; i++) {
                var li = items[i];
                var a = li.first("a");
                if (!a) continue;
                var href = a.attr("href");
                var subj = li.first(".subj");
                var date = li.first("span.date");
                out.push({
                    viewerLink: href ? this._abs(href) : "",
                    episodeTitle: subj ? subj.text.trim() : "",
                    exposureDateMillis: date ? Date.parse(date.text.trim()) || Date.now() : Date.now()
                });
                if (!href) out.pop();
            }
            if (items.length < 10) break;
            page++;
        }
        return out;
    },

    _episodeNumber: function (title, index) {
        var m = String(title).match(/(?:e(?:p(?:isode)?)?|ch(?:apter)?)\s*\.?\s*(\d+(?:\.\d+)?)/i);
        if (m) return parseFloat(m[1]);
        var bare = String(title).match(/\b(\d+(?:\.\d+)?)\b/);
        if (bare) return parseFloat(bare[1]);
        return index;
    },

    getChapterList: function (id, url) {
        url = this._abs(url);
        var info = this._titleInfo(url);
        var episodes = null;
        if (info) {
            episodes = this._episodesFromApi(info);
            if (episodes) {
                console.log("Webtoons: API returned " + episodes.length + " episodes");
            } else {
                console.log("Webtoons: mobile API failed, falling back to HTML episode list");
            }
        }
        if (!episodes) episodes = this._episodesFromHtml(url);
        if (!episodes || episodes.length === 0) {
            console.log("Webtoons: no episodes found for " + url);
            return [];
        }

        var out = [];
        // episodeList is newest-first; expose oldest-first like the Kotlin source
        for (var i = episodes.length - 1; i >= 0; i--) {
            var ep = episodes[i];
            var link = this._abs(ep.viewerLink || "");
            if (!link) continue;
            out.push({
                url: link,
                name: ep.episodeTitle || "Episode " + (i + 1),
                dateUpload: ep.exposureDateMillis || Date.now(),
                chapterNumber: this._episodeNumber(ep.episodeTitle || "", i + 1),
                scanlator: "Webtoons"
            });
        }
        return out;
    },

    // Webtoons.kt: div#_imageList > img data-url
    getPageList: function (chapterId, url) {
        url = this._abs(url);
        console.log("Webtoons: pages " + url);
        var html = Network.get(url);
        if (!html || typeof html !== "string") return [];
        var doc = Html.parse(html);
        var imgs = doc.select("#_imageList img");
        var out = [];
        for (var i = 0; i < imgs.length; i++) {
            var src = imgs[i].attr("data-url") || imgs[i].attr("src");
            if (src) out.push(src);
        }
        return out;
    }
};
