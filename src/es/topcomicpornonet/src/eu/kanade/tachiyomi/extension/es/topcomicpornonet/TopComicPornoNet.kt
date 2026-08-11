package eu.kanade.tachiyomi.extension.es.topcomicpornonet

import eu.kanade.tachiyomi.multisrc.madara.Madara
import keiyoushi.annotation.Source
import java.text.SimpleDateFormat
import java.util.Locale

@Source
abstract class TopComicPornoNet : Madara() {
    override val dateFormat = SimpleDateFormat("MMM dd, yy", Locale.forLanguageTag("es"))
    override val useLoadMoreRequest = LoadMoreStrategy.Never
    override val useNewChapterEndpoint = true
}
