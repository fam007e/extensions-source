---
# SPDX-License-Identifier: Apache-2.0
title: Coding standards
titleTemplate: Guides
description: Guidelines and best practices for extension development and maintenance.
---

# Coding standards & best practices

Guidelines and best practices for developing and maintaining extensions in this repository.

---

## 1. Modern Android & Java APIs

### WebP image compression
`Bitmap.CompressFormat.WEBP` is deprecated on Android 11 (API 30+). Use version-gated WebP compression formats:

```kotlin
val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    Bitmap.CompressFormat.WEBP_LOSSLESS // or WEBP_LOSSY
} else {
    @Suppress("DEPRECATION")
    Bitmap.CompressFormat.WEBP
}
bitmap.compress(format, quality, outputStream)
```

### Date and time parsing
Avoid legacy `SimpleDateFormat` and fragile string operations. Prefer `java.time` (`DateTimeFormatter`, `LocalDate`, `Instant`, `ZonedDateTime`) with safe parsing:

```kotlin
private val dateFormatter by lazy {
    DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ENGLISH)
}

val date = try {
    LocalDate.parse(dateStr, dateFormatter).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
} catch (_: Exception) {
    0L
}
```

### Modern locale construction
Avoid deprecated `Locale(language, country)` constructors. Use `Locale.of(...)`:

```kotlin
val locale = Locale.of("en", "US")
```

### WebView settings
Do not enable deprecated WebSettings such as `WebSettings.databaseEnabled`. Keep WebView interceptors minimal and clean.

---

## 2. Kotlin Compiler Hygiene & Null Safety

Under modern Kotlin compilers (Kotlin 2.x+):

* **Avoid redundant assertions (`!!`):** Do not assert non-null on types that are already non-null or smart-cast.
* **Avoid dead Elvis operators (`?:`):** Remove redundant fallback Elvis operators on non-null values.
* **Avoid unnecessary safe calls (`?.`):** Do not use `?.` on non-nullable receivers.
* **Exhaustive branching:** Ensure `when` blocks handle all cases safely.

---

## 3. Extension Architecture (Keiyoushi 1.6)

* **Extend `KeiSource`:** All new extensions must extend `KeiSource` (`libVersion = "1.6"`), not legacy `HttpSource`.
* **Metadata via Gradle DSL:** Do not manually declare `name`, `lang`, `id`, or `baseUrl` in `@Source` classes. Define them in `source {}` blocks within `build.gradle.kts`.
* **DTO Models:** Use regular `class` instead of `data class` for `@Serializable` models to reduce APK bytecode overhead.
* **Shared Utilities:** Use `keiyoushi.utils` (`response.parseAs<T>()`, `toJsonRequestBody()`) instead of local JSON or client instances.

---

## 4. Code Formatting & Linting

Before committing:

```bash
# Format code with Spotless
./gradlew spotlessApply

# Run release lint on your extension
./gradlew :src:<lang>:<extension>:lintRelease
```
