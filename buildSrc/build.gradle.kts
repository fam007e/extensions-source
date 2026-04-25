plugins {
    `kotlin-dsl`
}

dependencies {
    implementation(libs.gradle.agp)
    implementation(libs.gradle.kotlin)
    implementation(libs.gradle.serialization)
    implementation(libs.spotless.gradle)
    
    // Direct security overrides for buildSrc tools
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
