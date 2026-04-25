buildscript {
    repositories {
        mavenCentral()
        google()
        maven(url = "https://jitpack.io")
    }

    configurations.all {
        resolutionStrategy {
            // Force these for the buildscript classpath (handles jetifier, etc)
            force("org.jdom:jdom2:2.0.6.1")
            force("org.bitbucket.b_c:jose4j:0.9.6")
            force("org.apache.commons:commons-lang3:3.18.0")
            force("org.apache.httpcomponents:httpclient:4.5.13")
            force("org.bouncycastle:bcpkix-jdk18on:1.84")
            force("org.bouncycastle:bcprov-jdk18on:1.84")
        }
    }

    dependencies {
        classpath(libs.gradle.agp)
        classpath(libs.gradle.kotlin)
        classpath(libs.gradle.serialization)
        classpath(libs.spotless.gradle)
    }
}

allprojects {
    configurations.all {
        resolutionStrategy {
            // Force these project-wide (handles all 1,300+ modules)
            force("org.jdom:jdom2:2.0.6.1")
            force("org.bitbucket.b_c:jose4j:0.9.6")
            force("org.apache.commons:commons-lang3:3.18.0")
            force("org.apache.httpcomponents:httpclient:4.5.13")
            force("org.apache.httpcomponents:httpcore:4.4.13")
            force("org.bouncycastle:bcpkix-jdk18on:1.84")
            force("org.bouncycastle:bcprov-jdk18on:1.84")
            force("org.bouncycastle:bcutil-jdk18on:1.84")

            // Align all Netty modules to the same version
            eachDependency {
                if (requested.group == "io.netty") {
                    useVersion("4.1.132.Final")
                }
            }
        }
    }
}
