/**
 * MihonQT Extension
 * name: Toonily
 * pkg: en.toonily
 * version: 1.6.77
 * code: 77
 * nsfw: 1
 * template: madara
 */
var source = madaraTemplate({
    name: "Toonily",
    id: 1002001,
    pkg: "en.toonily",
    lang: "en",
    baseUrl: "https://toonily.com",
    // Toonily.kt: mangaSubString = "serie"
    mangaPath: "/serie",
    // Toonily.kt: mangaDetailsSelectorDescription override
    descriptionSelector: "div.content-area div.summary__content"
});
