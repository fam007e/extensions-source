buildscript {
    repositories {
        google()
        mavenCentral()
        maven(url = "https://www.jitpack.io")
    }

    configurations.all {
        resolutionStrategy {
            // Force these for the buildscript classpath (handles jetifier, etc)
            force(libs.jdom2)
            force(libs.jose4j)
            force(libs.commons.lang3)
            force(libs.httpclient)
            force(libs.bc.pkix)
            force(libs.bc.prov)
        }
    }

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

allprojects {
    configurations.all {
        resolutionStrategy {
            // Force these project-wide (handles all 1,300+ modules)
            force(libs.jdom2)
            force(libs.jose4j)
            force(libs.commons.lang3)
            force(libs.httpclient)
            force(libs.httpcore)
            force(libs.bc.pkix)
            force(libs.bc.prov)
            force(libs.bc.util)

            // Align all Netty modules to the same version
            eachDependency {
                if (requested.group == "io.netty") {
                    useVersion(libs.versions.netty.get())
                }
            }
        }
    }
}

val buildLogic: IncludedBuild = gradle.includedBuild("build-logic")
tasks {
    listOf("clean", "spotlessApply", "spotlessCheck").forEach { task ->
        named(task) {
            dependsOn(buildLogic.task(":$task"))
        }
    }
}
