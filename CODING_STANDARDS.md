# Repository Coding Standards & Best Practices

This document outlines the code quality, API modernization, and hygiene standards implemented in this repository. All contributors and extension maintainers should follow these guidelines.

---

## 1. Modern Android & Java APIs

### Bitmap WebP Compression
`Bitmap.CompressFormat.WEBP` is deprecated in API 30+ (Android R). Use version-gated WebP compression formats:

```kotlin
val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    Bitmap.CompressFormat.WEBP_LOSSLESS // or WEBP_LOSSY depending on use case
} else {
    @Suppress("DEPRECATION")
    Bitmap.CompressFormat.WEBP
}
bitmap.compress(format, quality, outputStream)
```

### Date and Time Parsing
Avoid legacy `SimpleDateFormat` and deprecated `SimpleDateFormat.tryParse` patterns. Prefer `java.time` (`DateTimeFormatter`, `LocalDate`, `Instant`, `ZonedDateTime`) with safe parsing extensions:

```kotlin
// Preferred: java.time with DateTimeFormatter
private val dateFormatter by lazy {
    DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ENGLISH)
}

// Parse safely without throwing uncaught exceptions on malformed dates
val date = try {
    LocalDate.parse(dateStr, dateFormatter).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
} catch (_: Exception) {
    0L
}
```

### Modern Locale Construction
Avoid deprecated `Locale(language, country)` constructors. Use `Locale.of(...)`:

```kotlin
// Modern Java 19+ / Android API:
val locale = Locale.of("en", "US")
```

### WebView Interceptor Settings
Do not enable deprecated WebSettings such as `WebSettings.databaseEnabled`. Use modern storage options and keep WebView interceptors minimal.

---

## 2. Kotlin Compiler Hygiene & Null Safety

With stricter analysis in modern Kotlin (Kotlin 2.x+):

* **No Redundant Non-Null Assertions (`!!`):** Do not assert non-null on types that are already smart-cast or non-nullable.
* **No Dead Elvis Operators (`?:`):** Avoid fallback Elvis chains when the left-hand expression cannot be null.
* **No Unnecessary Safe Calls (`?.`):** Do not use `?.` on non-nullable receivers.
* **Exhaustive `when` Statements:** Ensure all branches are covered explicitly without throwing unchecked exceptions.

---

## 3. Extension Architecture (Keiyoushi 1.6 Standards)

* **Extend `KeiSource`:** All new extensions must extend `KeiSource` (`libVersion = "1.6"`), not legacy `HttpSource`.
* **Metadata via KSP:** Do not manually declare or override `val name`, `lang`, `id`, or `baseUrl` in `@Source` classes. Define them in `source {}` blocks within `build.gradle.kts`.
* **No `data class` for DTOs:** Use standard `class` for `@Serializable` models to reduce bytecode bloat.
* **Use Shared Utilities:** Avoid initializing local `Json` or `HttpClient` instances. Rely on `keiyoushi.utils` (`response.parseAs<T>()`, `toJsonRequestBody()`, etc.).

---

## 4. Code Formatting & Linting

Before committing or submitting changes:

1. **Spotless Code Formatting:**
   ```bash
   ./gradlew spotlessApply
   ```

2. **Android Release Lint:**
   ```bash
   ./gradlew :src:<lang>:<extension>:lintRelease
   ```
   For multisrc themes:
   ```bash
   ./gradlew :lib-multisrc:<theme>:lintRelease
   ```
