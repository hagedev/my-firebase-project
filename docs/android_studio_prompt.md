
# Prompt untuk AI Android Studio: Aplikasi Admin Kafe Native AirCafe

## 1. Tujuan Utama Aplikasi

Buat sebuah aplikasi Android **100% native** menggunakan **Kotlin** dan **Jetpack Compose**. Aplikasi ini berfungsi sebagai **dasbor admin yang lengkap dan fungsional** untuk Admin Kafe dari platform "AirCafe".

Tujuan utama aplikasi ini adalah:
1.  Mengautentikasi Admin Kafe menggunakan Firebase Authentication (Email & Password).
2.  Setelah login berhasil, verifikasi peran pengguna dan ambil `tenantId` dari Firestore.
3.  Menyediakan antarmuka **native** yang kaya untuk mengelola semua aspek operasional kafe, mencakup:
    *   **Dashboard**: Melihat statistik penjualan dan pesanan harian.
    *   **Manajemen Pesanan**: Memantau dan memperbarui status pesanan masuk secara *real-time*.
    *   **Manajemen Menu**: Fungsi penuh (Create, Read, Update, Delete) untuk semua item menu.
    *   **Manajemen Meja**: Fungsi penuh (CRUD) untuk meja-meja di kafe.
    *   **Pengaturan Kafe**: Mengonfigurasi dan memperbarui detail profil kafe.

Aplikasi ini **sepenuhnya native** dan **TIDAK menggunakan WebView**.

---

## 2. Arsitektur dan Teknologi

*   **Bahasa**: Kotlin
*   **UI Toolkit**: Jetpack Compose
*   **Arsitektur**: MVVM (Gunakan `ViewModel` untuk setiap layar atau grup fitur).
*   **Asynchronous**: Gunakan Coroutines dan `StateFlow` untuk mengelola state UI.
*   **Navigasi**: Gunakan Jetpack Navigation for Compose (`androidx.navigation:navigation-compose`).
*   **Dependensi (sertakan di `build.gradle.kts`):**
    *   Jetpack Compose (Activity, UI, Material3, Tooling Preview)
    *   Lifecycle & ViewModel (`androidx.lifecycle:lifecycle-viewmodel-ktx`, `androidx.lifecycle:lifecycle-runtime-compose`)
    *   Navigation Compose (`androidx.navigation:navigation-compose`)
    *   Firebase Bill of Materials (`com.google.firebase:firebase-bom`)
    *   Firebase Authentication (`com.google.firebase:firebase-auth-ktx`)
    *   Firebase Firestore (`com.google.firebase:firebase-firestore-ktx`)

---

## 3. Fitur, Layar, dan Alur Kerja

Gunakan komponen `MaterialTheme` (Material 3) dengan warna primer `#FF9800` dan latar `#FFF3E0`.

### A. Alur Navigasi Utama

*   **`MainActivity.kt`**: Mengatur `NavHost` utama dengan dua rute: `"login"` dan `"main/{tenantId}"`. Rute awal adalah `"login"`.
*   **`LoginScreen.kt`**: Setelah login berhasil dan `tenantId` didapat, navigasi ke `"main/{tenantId}"` dan pastikan untuk membersihkan *back stack* agar pengguna tidak bisa kembali ke halaman login dengan tombol kembali.

### B. Layar Login (`LoginScreen.kt` & `LoginViewModel.kt`)

*   **UI**: Sama seperti permintaan sebelumnya (Logo, Judul, Email, Password, Tombol Login, Pesan Error).
*   **Logic**:
    1.  ViewModel menangani state untuk `email`, `password`, `isLoading`, dan `errorMessage`.
    2.  Saat tombol "Masuk" diklik, panggil `signInWithEmailAndPassword`.
    3.  Jika berhasil, panggil `UserRepository` untuk memverifikasi peran "admin_kafe" dan mendapatkan `tenantId`.
    4.  Jika valid, navigasi ke rute `"main/{tenantId}"`.
    5.  Jika gagal (baik auth maupun verifikasi peran), tampilkan pesan error yang sesuai.

### C. Layout Utama Setelah Login (`MainScreen.kt`)

*   Layar ini berfungsi sebagai *host* untuk fitur-fitur utama.
*   Gunakan `Scaffold` yang berisi `BottomNavigationBar`.
*   `BottomNavigationBar` memiliki 5 item: **Dashboard**, **Pesanan**, **Menu**, **Meja**, dan **Settings**.
*   Gunakan `NavHost` *nested* di dalam `Scaffold` untuk menavigasi antar kelima layar fitur tersebut.

### D. Layar-Layar Fitur (Native)

#### 1. Dashboard (`DashboardScreen.kt` & `DashboardViewModel.kt`)
*   **UI**: Tampilkan beberapa komponen `Card` untuk statistik utama: "Pendapatan Hari Ini", "Total Pesanan Hari Ini", dan "Status Menu (Tersedia/Habis)". Gunakan `CircularProgressIndicator` saat data sedang dimuat.
*   **Logic**: ViewModel mengambil `tenantId`. Lakukan query ke koleksi `orders` untuk hari ini, hitung total pendapatan dan jumlahnya. Lakukan query ke koleksi `menus` untuk menghitung status ketersediaan.

#### 2. Manajemen Pesanan (`OrdersScreen.kt` & `OrdersViewModel.kt`)
*   **UI**: Gunakan `LazyColumn` untuk menampilkan daftar `Card` pesanan secara *real-time* untuk hari ini. Setiap `Card` menampilkan nomor meja, total harga, jam pesanan, dan status saat ini.
*   Setiap `Card` harus memiliki:
    *   `ExposedDropdownMenuBox` atau komponen sejenis untuk mengubah status pesanan (`diterima`, `disiapkan`, `siap diambil`, `selesai`).
    *   Sebuah `Switch` untuk menandai status pembayaran ("Lunas" / "Belum Lunas").
*   **Logic**: ViewModel menggunakan `snapshotFlow` atau `addSnapshotListener` untuk mendengarkan perubahan pada koleksi `/tenants/{tenantId}/orders` (dengan filter tanggal hari ini). Sediakan fungsi untuk `updateDoc` guna mengubah status pesanan dan status pembayaran.

#### 3. Manajemen Menu (`MenuScreen.kt` & `MenuViewModel.kt`)
*   **UI**: Gunakan `LazyColumn` untuk menampilkan daftar menu. Setiap item menampilkan nama, harga, dan ketersediaan. Gunakan `FloatingActionButton` (FAB) untuk membuka dialog "Tambah Menu Baru".
*   Setiap item menu di daftar memiliki opsi (misal: ikon titik tiga) untuk "Edit" dan "Hapus".
*   Dialog "Tambah/Edit" akan menjadi `AlertDialog` atau layar baru yang berisi form untuk mengisi detail menu (nama, harga, kategori, deskripsi, ketersediaan).
*   **Logic**: ViewModel mendengarkan koleksi `/tenants/{tenantId}/menus`. Sediakan fungsi untuk `addDoc`, `updateDoc`, dan `deleteDoc`.

#### 4. Manajemen Meja (`TablesScreen.kt` & `TablesViewModel.kt`)
*   **UI**: Serupa dengan `MenuScreen`, gunakan `LazyColumn` untuk menampilkan daftar meja beserta statusnya ('tersedia'/'terisi'). Gunakan FAB untuk menambah meja baru.
*   Setiap item meja memiliki opsi untuk "Hapus".
*   **Logic**: ViewModel mendengarkan koleksi `/tenants/{tenantId}/tables`. Sediakan fungsi untuk `addDoc` dan `deleteDoc`.

#### 5. Pengaturan (`SettingsScreen.kt` & `SettingsViewModel.kt`)
*   **UI**: Buat sebuah form menggunakan `Column` dan `OutlinedTextField` untuk mengedit data tenant seperti: Nama Kafe, Alamat, Nama Pemilik, No. Telepon, Pesan Struk, dan Token Harian.
*   **Logic**: ViewModel mengambil data tenant saat ini. Sediakan fungsi `saveSettings` yang akan melakukan `updateDoc` pada dokumen `/tenants/{tenantId}`.

---

## 4. Interaksi dengan Firebase & Model Data

Buat **Data Class** Kotlin untuk setiap entitas Firestore agar parsing data menjadi *type-safe*.

```kotlin
// /users/{userId}
data class User(
    val authUid: String = "",
    val email: String = "",
    val role: String = "", // "admin_kafe" atau "superadmin"
    val tenantId: String? = null
)

// /tenants/{tenantId}
data class Tenant(
    val name: String = "",
    val slug: String = "",
    val address: String? = null,
    val ownerName: String? = null,
    val phoneNumber: String? = null,
    val receiptMessage: String? = null,
    val tokenHarian: String = ""
)

// /tenants/{tenantId}/menus/{menuId}
data class Menu(
    val name: String = "",
    val description: String? = null,
    val price: Double = 0.0,
    val category: String = "",
    val available: Boolean = true
)

// /tenants/{tenantId}/orders/{orderId}
data class Order(
    val tableNumber: Int = 0,
    val totalAmount: Double = 0.0,
    val status: String = "received",
    val paymentVerified: Boolean = false,
    val createdAt: com.google.firebase.Timestamp = com.google.firebase.Timestamp.now()
    // Sertakan field lain yang relevan
)

// /tenants/{tenantId}/tables/{tableId}
data class Table(
    val tableNumber: Int = 0,
    val status: String = "available" // "available" atau "occupied"
)
```

Gunakan **Repository Pattern** (`UserRepository`, `TenantRepository`, `MenuRepository`, dll.) untuk memisahkan logika akses data dari `ViewModel`. Setiap fungsi di repository yang berinteraksi dengan Firestore harus berupa `suspend fun`.

Silakan hasilkan kode berdasarkan spesifikasi di atas, dimulai dari struktur navigasi di `MainActivity.kt`.
