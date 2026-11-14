/**
 * MihonQT Extension
 * name: Toonily
 * pkg: en.toonily
 * version: 1.6.77
 * code: 78
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
    descriptionSelector: "div.content-area div.summary__content",
    // Toonily.kt sets the toonily-mature cookie so the server stops
    // filtering adult titles out of browse/search results
    matureCookie: ["toonily-mature", "1"]
});
