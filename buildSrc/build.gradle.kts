plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
    google()
}

dependencies {
    implementation(libs.gradle.agp)
    implementation(libs.gradle.kotlin)
    implementation(libs.gradle.serialization)
    implementation(libs.spotless.gradle)
    
    // Build tools require their own constraints as buildSrc is a separate build
    implementation(platform(libs.netty.bom))
    constraints {
        implementation(libs.jdom2)
        implementation(libs.jose4j)
        implementation(libs.commons.lang3)
        implementation(libs.httpclient)
        implementation(libs.httpcore)
        implementation(libs.bc.pkix)
        implementation(libs.bc.prov)
        implementation(libs.bc.util)
    }
}
