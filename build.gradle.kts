buildscript {
    repositories {
        mavenCentral()
        google()
        maven(url = "https://jitpack.io")
    }
    dependencies {
        classpath(libs.gradle.agp)
        classpath(libs.gradle.kotlin)
        classpath(libs.gradle.serialization)
        classpath(libs.spotless.gradle)
        
        // Apply strict security overrides to all build tools
        classpath(platform(libs.netty.bom))
        classpath(libs.bundles.security)
    }
}
