
# Prompt untuk AI Android Studio: Aplikasi Login Admin AirCafe

## 1. Tujuan Utama Aplikasi

Buat sebuah aplikasi Android **native** menggunakan **Kotlin** dan **Jetpack Compose**. Aplikasi ini berfungsi sebagai gerbang login yang aman untuk **Admin Kafe** platform "AirCafe".

Tujuan utama aplikasi ini adalah:
1.  Mengautentikasi Admin Kafe menggunakan Firebase Authentication (Email & Password).
2.  Setelah login berhasil, verifikasi peran pengguna di Firestore.
3.  Mengambil slug unik kafe yang dikelola oleh admin tersebut dari Firestore.
4.  Membuka dasbor admin **web** yang sudah ada di dalam **WebView** menggunakan slug yang telah diambil.

Aplikasi ini **TIDAK** membuat ulang dasbor admin secara native, melainkan hanya sebagai *launcher* yang aman menuju dasbor web yang ada.

---

## 2. Arsitektur dan Teknologi

*   **Bahasa**: Kotlin
*   **UI Toolkit**: Jetpack Compose
*   **Arsitektur**: MVVM (ViewModel untuk setiap layar)
*   **Asynchronous**: Gunakan Coroutines dan Flow untuk operasi asynchronous.
*   **Dependensi (sertakan di `build.gradle.kts`):**
    *   Jetpack Compose (Activity, UI, Material3, Tooling Preview)
    *   Lifecycle & ViewModel (`androidx.lifecycle:lifecycle-viewmodel-ktx`)
    *   Firebase Bill of Materials (`com.google.firebase:firebase-bom`)
    *   Firebase Authentication (`com.google.firebase:firebase-auth-ktx`)
    *   Firebase Firestore (`com.google.firebase:firebase-firestore-ktx`)
    *   Accompanist WebView (`com.google.accompanist:accompanist-webview`) - *Catatan: Jika Accompanist sudah tidak relevan, gunakan alternatif `WebView` di dalam Jetpack Compose.*

---

## 3. Fitur dan Alur Kerja

### Layar 1: Halaman Login (`LoginScreen.kt`)

#### A. Komponen UI (Jetpack Compose):

*   **Logo AirCafe**: Tampilkan di bagian atas.
*   **Judul**: Teks "Login Admin Kafe".
*   **Email Field**: `OutlinedTextField` dengan label "Email".
*   **Password Field**: `OutlinedTextField` dengan label "Password" dan input visual tersembunyi.
*   **Login Button**: `Button` dengan teks "Masuk". Tombol ini harus menampilkan `CircularProgressIndicator` dan dinonaktifkan selama proses login.
*   **Error Message**: Sebuah `Text` untuk menampilkan pesan error (misal: "Email atau password salah").

#### B. Gaya Desain:

*   Gunakan komponen `MaterialTheme` (Material 3).
*   **Warna Primer**: `#FF9800` (Gunakan untuk warna utama tombol, aksen, dan fokus).
*   **Warna Latar**: `#FFF3E0`.
*   **Font Judul**: 'Playfair Display' (Jika memungkinkan untuk menambah font custom, jika tidak, gunakan font serif sistem).
*   **Font Isi**: 'PT Sans' (Jika memungkinkan, jika tidak, gunakan font sans-serif sistem).

#### C. Logika (`LoginViewModel.kt`):

1.  ViewModel harus memiliki state untuk `email`, `password`, `isLoading`, dan `errorMessage`.
2.  Ketika tombol "Masuk" diklik, panggil fungsi di ViewModel.
3.  Gunakan `firebaseAuth.signInWithEmailAndPassword(email, password)`.
4.  Jika berhasil:
    *   Dapatkan `FirebaseUser`.
    *   Panggil fungsi dari `UserRepository` (lihat di bawah) untuk memverifikasi peran dan mendapatkan `tenantSlug`.
    *   Navigasi ke Layar Dasbor (WebView) dengan `tenantSlug` sebagai argumen.
5.  Jika gagal (misal: `auth/invalid-credential`):
    *   Update `errorMessage` state untuk ditampilkan di UI.
    *   Set `isLoading` menjadi `false`.

### Layar 2: Halaman Dasbor WebView (`DashboardScreen.kt`)

#### A. Komponen UI:

*   Layar ini harus berisi komponen `WebView` (dari Accompanist atau alternatifnya) yang memenuhi seluruh layar.
*   Tampilkan `CircularProgressIndicator` saat halaman web sedang dimuat.

#### B. Logika (`DashboardViewModel.kt`):

1.  ViewModel menerima `tenantSlug` sebagai argumen dari navigasi.
2.  Buat URL lengkap untuk dasbor web: `https://<YOUR_DOMAIN_HERE>/${tenantSlug}/admin`. **Gunakan placeholder `<YOUR_DOMAIN_HERE>` jika domain asli tidak diketahui.**
3.  URL ini diberikan ke komponen `WebView` untuk dimuat.

---

## 4. Interaksi dengan Firebase (Firestore)

Buat sebuah `UserRepository` class untuk menangani logika Firestore.

#### A. Data Model (Kotlin Data Classes):

Buat data class yang sesuai dengan skema JSON berikut:

```kotlin
// Untuk /users/{userId}
data class User(
    val authUid: String = "",
    val email: String = "",
    val role: String = "",
    val tenantId: String? = null
)

// Untuk /tenants/{tenantId}
data class Tenant(
    val name: String = "",
    val slug: String = ""
)
```

#### B. Logika `UserRepository`:

Buat fungsi `suspend fun getTenantSlugForAdmin(user: FirebaseUser): Result<String>`:

1.  Dapatkan referensi dokumen user: `firestore.collection("users").document(user.uid)`.
2.  Lakukan `get()` pada dokumen tersebut.
3.  Jika dokumen tidak ada, kembalikan `Result.failure` dengan pesan "Profil user tidak ditemukan."
4.  Deserialisasi data dokumen menjadi data class `User`.
5.  Periksa apakah `user.role == "admin_kafe"` dan `user.tenantId` tidak null. Jika tidak, kembalikan `Result.failure` dengan pesan "Anda bukan admin kafe."
6.  Jika valid, gunakan `tenantId` untuk mendapatkan dokumen tenant: `firestore.collection("tenants").document(tenantId)`.
7.  Lakukan `get()` pada dokumen tenant.
8.  Jika dokumen tenant ada, deserialisasi menjadi data class `Tenant` dan kembalikan `Result.success(tenant.slug)`.
9.  Jika dokumen tenant tidak ada, kembalikan `Result.failure` dengan pesan "Data kafe tidak ditemukan."
10. Tangani semua kemungkinan `Exception` (misal: permission denied) dan kembalikan `Result.failure`.

---

## 5. Konfigurasi Proyek

*   **`AndroidManifest.xml`**: Pastikan izin `INTERNET` ditambahkan.
*   **Struktur Proyek**: Buat package terpisah untuk `ui` (screens, viewmodels), `data` (repository, models), dan `di` (jika menggunakan dependency injection).
*   **Navigasi**: Gunakan `NavHost` dari Jetpack Compose untuk navigasi antar `LoginScreen` dan `DashboardScreen`.

Silakan hasilkan kode berdasarkan spesifikasi di atas. Mulai dari `MainActivity.kt` yang mengatur `NavHost`.
