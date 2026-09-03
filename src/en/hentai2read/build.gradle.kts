import io.github.keiyoushi.gradle.api.ContentWarning

plugins {
    alias(kei.plugins.extension)
}

keiyoushi {
    name = "Hentai2Read"
    versionCode = 19
    contentWarning = ContentWarning.NSFW
    libVersion = "1.4"

    deeplink {
        host("hentai2read.com")
        path("/..*")
    }

    source {
        name = "Hentai2Read"
        lang = "en"
        baseUrl = "https://hentai2read.com"
    }
}
