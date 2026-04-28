plugins {
    application
    kotlin("plugin.serialization")
}

dependencies {
    implementation(libs.bundles.androidcompat.implementation)
    compileOnly(libs.bundles.androidcompat.compileonly)

    // Android stub library
    implementation(fileTree("lib/"))

    // Config API
    implementation(project(":AndroidCompat:Config"))
}

tasks {
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        compilerOptions {
            freeCompilerArgs.addAll("-opt-in=kotlin.RequiresOptIn")
        }
    }
}
