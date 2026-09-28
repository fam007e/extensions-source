package eu.kanade.tachiyomi.extension.tr.paradoxscans

import eu.kanade.tachiyomi.multisrc.initmanga.InitManga
import eu.kanade.tachiyomi.source.model.SManga
import keiyoushi.annotation.Source
import org.jsoup.nodes.Element

@Source
abstract class ParadoxScans : InitManga() {

    override val latestUrlSlug = "recently-updated"

    override fun popularMangaSelector() = "div.manga-item-grid > div.uk-panel"

    override fun popularMangaFromElement(element: Element) = SManga.create().apply {
        val linkElement = element.selectFirst("div.uk-overflow-hidden a")
            ?: element.selectFirst("h2 a, h3 a, a.uk-link-heading")
            ?: element.selectFirst("a")

        title = element.selectFirst("h2 a, h3 a, h2, h3")?.text().orEmpty()

        setUrlWithoutDomain(linkElement!!.absUrl("href"))

        thumbnail_url = element.selectFirst("img")?.let { img ->
            img.absUrl("data-src").ifEmpty { img.absUrl("src") }
        }
    }
}
