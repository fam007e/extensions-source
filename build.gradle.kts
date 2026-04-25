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

allprojects {
    configurations.all {
        resolutionStrategy {
            // Force these versions project-wide to remediate CVEs
            // Using the catalog values ensures we are using the patched versions
            force(libs.jdom2)
            force(libs.jose4j)
            force(libs.commons.lang3)
            force(libs.httpclient)
            force(libs.httpcore)
            force(libs.bc.pkix)
            force(libs.bc.prov)
            force(libs.bc.util)
        }
    }
}
