buildscript {
    dependencies {
        classpath(libs.kotlin.gradle)

        // Apply strict security overrides to all build tools
        classpath(platform(libs.netty.bom))
        classpath(libs.bundles.security)
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.serialization) apply false

    alias(kei.plugins.spotless)
}

val buildLogic: IncludedBuild = gradle.includedBuild("build-logic")
tasks {
    listOf("clean", "spotlessApply", "spotlessCheck").forEach { task ->
        named(task) {
            dependsOn(buildLogic.task(":$task"))
        }
    }
}
