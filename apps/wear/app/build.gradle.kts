plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Sube solo en cada compilación: minutos desde el 1 de enero de 2026 (igual que el teléfono).
val buildStamp = (System.currentTimeMillis() / 60_000L - 29_453_760L).toInt()


android {
    namespace = "mx.bloque21.app"
    compileSdk = 36

    defaultConfig {
        // El mismo applicationId que el teléfono: Data Layer lo exige para vincular.
        applicationId = "mx.bloque21.app"
        minSdk = 30
        targetSdk = 36
        versionCode = buildStamp
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.wear.compose:compose-material3:1.5.6")
    implementation("androidx.wear.compose:compose-foundation:1.5.6")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-guava:1.11.0")
    implementation("androidx.wear.tiles:tiles:1.5.0")
    implementation("androidx.wear.protolayout:protolayout:1.3.0")
    implementation("androidx.wear.compose:compose-navigation:1.5.6")
    implementation("androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1")
    implementation("androidx.work:work-runtime-ktx:2.10.5")

    testImplementation("junit:junit:4.13.2")
}
