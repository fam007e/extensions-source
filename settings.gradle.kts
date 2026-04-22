
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        google()
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
                            require("4.1.132.Final") 
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
