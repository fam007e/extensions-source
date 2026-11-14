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
