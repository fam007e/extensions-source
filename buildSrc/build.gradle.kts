plugins {
    `kotlin-dsl`
}

dependencies {
    implementation(libs.gradle.agp)
    implementation(libs.gradle.kotlin)
    implementation(libs.gradle.serialization)
    implementation(libs.spotless.gradle)
    
    // Strict security overrides for buildSrc
    implementation(platform(libs.netty.bom))
    implementation(libs.bundles.security)
}
