/**
 * MihonQT Template: HiperDex-theme sites (tRPC JSON API).
 * Not installed directly — js/tools/build_js_repo.py inlines this file
 * before the site config when a site declares `template: hiper`.
 *
 * Ported from extensions-source lib-multisrc/hiper (Hiper.kt).
 * Limitations vs the Kotlin source: no custom "x-cfg-auth" header (the
 * 401 -> fetch homepage -> retry path is approximated with the shared
 * cookie jar), no WebView fallback.
 */
function hiperTemplate(cfg) {
    var T = {
        name: cfg.name,
        id: cfg.id,
        pkg: cfg.pkg,
        lang: cfg.lang,
        baseUrl: cfg.baseUrl,
        supportsLatest: true,

        _limit: 30,

        // tRPC batch request builder; input is the exact JSON structure the
        // Kotlin source builds (including the superjson "undefined" markers).
        // On auth failure (401, like Hiper.kt's AuthInterceptor), fetch the
        // homepage once to obtain a session cookie, then retry.
        _trpc: function (procs, input) {
            var url = this.baseUrl + "/api/trpc/" + procs.join(",") +
                "?batch=1&input=" + encodeURIComponent(JSON.stringify(input));
            console.log(this.name + ": trpc " + procs.join(","));
            var resp = Network.get(url);
            if (resp && typeof resp === "object" && !resp.error) return resp;
            console.log(this.name + ": tRPC request failed" +
                (resp && resp.error ? " (" + resp.error + ")" : (typeof resp) + " response") +
                " - fetching homepage for session cookies, retrying");
            Network.get(this.baseUrl + "/");
            resp = Network.get(url);
            if (!resp || typeof resp !== "object" || resp.error) {
                console.log(this.name + ": tRPC retry failed");
                return null;
            }
            return resp;
        },

        _searchInput: function (query, sort, page) {
            var input = {};
            input["0"] = {
                json: {
                    q: query || "",
                    sort: sort,
                    filters: { genres: null, type: null, status: null, contentRating: null, author: null, artist: null, year: null },
                    limit: this._limit,
                    offset: (page - 1) * this._limit,
                    maxRating: "pornographic"
                },
                meta: {
                    values: {
                        "filters.genres": ["undefined"],
                        "filters.type": ["undefined"],
                        "filters.status": ["undefined"],
                        "filters.contentRating": ["undefined"],
                        "filters.author": ["undefined"],
                        "filters.artist": ["undefined"],
                        "filters.year": ["undefined"]
                    }
                }
            };
            return input;
        },

        _hits: function (resp) {
            try {
                var json = resp[0].result.data.json;
                return (json && json.hits) || [];
            } catch (e) {
                return null;
            }
        },

        _status: function (text) {
            var t = (text || "").toLowerCase();
            if (t === "ongoing") return 1;
            if (t === "completed") return 2;
            if (t === "cancelled") return 5;
            if (t === "hiatus") return 6;
            return 0;
        },

        _mangaFromHit: function (hit, mangaPath) {
            var status = this._status(hit.status);
            var genreNames = [];
            var genres = hit.genres || [];
            for (var i = 0; i < genres.length; i++) {
                if (genres[i] && genres[i].name) genreNames.push(genres[i].name);
            }
            return {
                url: (mangaPath || "/manga") + "/" + hit.slug,
                title: hit.title || "",
                thumbnail_url: hit.coverUrl || "",
                description: hit.synopsis || "",
                genre: genreNames.join(", "),
                status: status,
                initialized: false
            };
        },

        _browse: function (page, sort) {
            page = page || 1;
            var resp = this._trpc(["search.query"], this._searchInput("", sort, page));
            if (!resp) return [];
            var hits = this._hits(resp);
            if (!hits) return [];
            var out = [];
            for (var i = 0; i < hits.length; i++) {
                out.push(this._mangaFromHit(hits[i], cfg.mangaPath));
            }
            return out;
        },

        getPopularManga: function (page) {
            return this._browse(page, "popular");
        },

        getLatestUpdates: function (page) {
            return this._browse(page, "recent");
        },

        getSearchManga: function (query) {
            var resp = this._trpc(["search.query"], this._searchInput(query || "", "relevance", 1));
            if (!resp) return [];
            var hits = this._hits(resp);
            if (!hits) return [];
            var out = [];
            for (var i = 0; i < hits.length; i++) {
                out.push(this._mangaFromHit(hits[i], cfg.mangaPath));
            }
            return out;
        },

        _slugFromUrl: function (url) {
            var m = String(url).match(/\/(?:manga|series)\/([^\/#?]+)/);
            return m ? m[1] : "";
        },

        _detailsBySlug: function (slug) {
            var input = {};
            input["0"] = { json: null, meta: { values: ["undefined"] } };
            input["1"] = { json: { slug: slug } };
            var resp = this._trpc(["auth.me", "series.bySlugWithGenres"], input);
            if (!resp) return null;
            try {
                return resp[resp.length - 1].result.data.json;
            } catch (e) {
                return null;
            }
        },

        getMangaDetails: function (id, url) {
            var slug = this._slugFromUrl(url);
            var dto = slug ? this._detailsBySlug(slug) : null;
            var manga = {
                url: url,
                title: "",
                initialized: true
            };
            if (!dto) return manga;

            manga.title = dto.title || "";
            manga.thumbnail_url = dto.coverUrl || "";
            manga.description = dto.synopsis || "";
            manga.status = this._status(dto.status);

            var genreNames = [];
            var genres = dto.genres || [];
            for (var i = 0; i < genres.length; i++) {
                if (genres[i] && genres[i].name) genreNames.push(genres[i].name);
            }
            if (genreNames.length) manga.genre = genreNames.join(", ");

            var authors = dto.authors || [];
            var authorNames = [];
            for (var a = 0; a < authors.length; a++) {
                if (authors[a] && authors[a].name) authorNames.push(authors[a].name);
            }
            if (authorNames.length) manga.author = authorNames.join(", ");

            var artists = dto.artists || [];
            var artistNames = [];
            for (var r = 0; r < artists.length; r++) {
                if (artists[r] && artists[r].name) artistNames.push(artists[r].name);
            }
            if (artistNames.length) manga.artist = artistNames.join(", ");

            return manga;
        },

        _fmtNumber: function (n) {
            if (typeof n !== "number" || isNaN(n)) return "0";
            return (n % 1 === 0) ? String(Math.floor(n)) : String(n);
        },

        _chaptersPage: function (seriesId, page) {
            var input = {};
            input["0"] = { json: { values: ["undefined"] } };
            input["1"] = {
                json: { seriesId: seriesId, chapterId: null, sort: "best", page: page, limit: 20 },
                meta: { values: { chapterId: ["undefined"] } }
            };
            input["2"] = { json: { seriesId: seriesId } };
            var resp = this._trpc(["auth.me", "series.chapters"], input);
            if (!resp) return null;
            try {
                var json = resp[resp.length - 1].result.data.json;
                return Array.isArray(json) ? json : [];
            } catch (e) {
                return null;
            }
        },

        getChapterList: function (id, url) {
            var slug = this._slugFromUrl(url);
            if (!slug) return [];

            // seriesId is not derivable from the URL; resolve it via the details call
            var dto = this._detailsBySlug(slug);
            var seriesId = dto ? dto.id : null;
            if (!seriesId) {
                console.log(this.name + ": could not resolve seriesId for " + slug);
                return [];
            }

            var out = [];
            var seenNumbers = {};
            var page = 1;
            while (page <= 50) {
                var batch = this._chaptersPage(seriesId, page);
                if (!batch) break;
                for (var i = 0; i < batch.length; i++) {
                    var ch = batch[i];
                    var numStr = this._fmtNumber(ch.number);
                    var unique = !seenNumbers[numStr];
                    seenNumbers[numStr] = true;
                    // duplicate chapter numbers get the chapter id in the URL (Kotlin behaviour)
                    var chapterPath = unique ? numStr : String(ch.id);
                    var dateUpload = ch.createdAt ? Date.parse(ch.createdAt) : Date.now();
                    if (isNaN(dateUpload)) dateUpload = Date.now();
                    out.push({
                        url: (cfg.mangaPath || "/manga") + "/" + slug + "/" + chapterPath,
                        name: ch.title && ch.title.trim() ? ch.title.trim() : "Chapter " + numStr,
                        dateUpload: dateUpload,
                        chapterNumber: ch.number || 0,
                        scanlator: this.name
                    });
                }
                if (batch.length < 20) break;
                page++;
            }
            return out;
        },

        getPageList: function (chapterId, url) {
            var parts = String(url).replace(/\/+$/, "").split("/");
            var slug = this._slugFromUrl(url);
            var numStr = parts[parts.length - 1];
            var chapterNumber = parseFloat(numStr);
            if (isNaN(chapterNumber)) chapterNumber = 0;

            var input = {};
            input["0"] = { json: null, meta: { values: ["undefined"] } };
            input["1"] = { json: { slug: slug } };
            input["2"] = { json: { seriesSlug: slug, chapterNumber: chapterNumber } };
            input["3"] = { json: { position: "footer_bottom" } };
            var resp = this._trpc(["auth.me", "series.bySlug", "reader.chapterPages"], input);
            if (!resp) return [];
            try {
                var json = resp[resp.length - 1].result.data.json;
                var pages = Array.isArray(json) ? json : [];
                pages.sort(function (a, b) { return (a.pageOrder || 0) - (b.pageOrder || 0); });
                var out = [];
                for (var i = 0; i < pages.length; i++) {
                    var src = pages[i].avifUrl || pages[i].webpUrl;
                    if (src) out.push(src);
                }
                return out;
            } catch (e) {
                return [];
            }
        }
    };
    return T;
}


/**
 * MihonQT Extension
 * name: Hiperdex
 * pkg: en.hiperdex
 * version: 1.6.92
 * code: 92
 * nsfw: 1
 * template: hiper
 */
var source = hiperTemplate({
    name: "Hiperdex",
    id: 1002003,
    pkg: "en.hiperdex",
    lang: "en",
    baseUrl: "https://hiperdex.tv"
});
