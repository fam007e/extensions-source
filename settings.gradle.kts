
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        google()
    }
}

buildscript {
    repositories {
        mavenCentral()
        google()
    }
    dependencies {
        // Explicit overrides to satisfy Dependabot's scanner for settings.gradle.kts
        classpath("org.jdom:jdom2:2.0.6.1")
        classpath("org.bitbucket.b_c:jose4j:0.9.6")
        classpath("org.apache.commons:commons-lang3:3.20.0")
        classpath("org.apache.httpcomponents:httpclient:4.5.13")
        classpath("org.bouncycastle:bcpkix-jdk18on:1.84")
        classpath("org.bouncycastle:bcprov-jdk18on:1.84")
        classpath("io.netty:netty-codec-http2:4.2.12.Final")
        classpath("io.netty:netty-handler:4.2.12.Final")
        classpath("io.netty:netty-codec-http:4.2.12.Final")
        classpath("io.netty:netty-codec:4.2.12.Final")
        classpath("io.netty:netty-common:4.2.12.Final")
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        mavenCentral()
        google()
        maven(url = "https://jitpack.io")
    }
    
    components.all {
        val details = this
        if (details.id.group == "io.netty") {
            details.allVariants {
                withDependencies {
                    forEach {
                        it.version { 
                            require("4.2.12.Final") 
                        }
                    }
                }
            }
        }
    }
}

/**
 * Add or remove modules to load as needed for local development here.
 */
loadAllIndividualExtensions()
// loadIndividualExtension("all", "mangadex")

/**
 * ===================================== COMMON CONFIGURATION ======================================
 */
include(":core")

// Load all modules under /lib
File(rootDir, "lib").eachDir { include("lib:${it.name}") }

// Load all modules under /lib-multisrc
File(rootDir, "lib-multisrc").eachDir { include("lib-multisrc:${it.name}") }

/**
 * ======================================== HELPER FUNCTION ========================================
 */
fun loadAllIndividualExtensions() {
    File(rootDir, "src").eachDir { dir ->
        dir.eachDir { subdir ->
            include("src:${dir.name}:${subdir.name}")
        }
    }
}
fun loadIndividualExtension(lang: String, name: String) {
    include("src:${lang}:${name}")
}

fun File.eachDir(block: (File) -> Unit) {
    val files = listFiles() ?: return
    for (file in files) {
        if (file.isDirectory && file.name != ".gradle" && file.name != "build") {
            block(file)
        }
    }
}
