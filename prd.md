# Product Requirements Document (PRD)

## Project: Academic Grammar & Proofreading Assistant (Pure Non-AI Linter)

---

## 1. Executive Summary & Core Philosophy

* **Objective:** Membangun aplikasi web pemeriksa tata bahasa (*grammar checker*) khusus untuk penulisan akademik (tesis, jurnal, tugas kuliah) yang berfokus murni pada pendeteksian dan perbaikan kesalahan gramatikal, ejaan (*spelling*), dan tanda baca (*punctuation*).
* **Anti-Paraphrase & Academic Integrity Principle:**
  * Sistem **secara ketat dilarang** menggunakan Generative AI / LLM untuk menulis ulang (*paraphrase*), memperindah kosakata, atau mengubah struktur kalimat asli pengguna.
  * Mengeliminasi godaan ketergantungan AI sehingga tulisan tetap 100% autentik sesuai gaya bahasa penulis dan aman dari detektor konten AI (*AI detectors*).
* **Educational Feedback:** Setiap deteksi kesalahan wajib disertai penjelasan kaidah tata bahasa (*grammatical explanation*) yang jelas agar pengguna memahami alasan perbaikannya.
* **UI/UX Design:** **Distraction-Free Monochromatic Split-Screen**. Desain bersih bergaya editorial/kertas kerja, minim ikon dekoratif, dan mengutamakan keterbacaan tipografi.

---

## 2. Technical Architecture & Zero-Cost Engine

| Layer | Technology | Role & Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), Tailwind CSS | Antarmuka editor *split-screen*, penyorotan teks interaktif, dan kartu penjelasan koreksi. |
| **Grammar Engine** | **LanguageTool API** (Public / Local Docker) | Mesin *rule-based NLP* non-generatif untuk mendeteksi error gramatikal serta menyediakan alasan tata bahasa. |
| **State Management** | React State / LocalStorage | Menyimpan draf sementara dan daftar istilah teknis/jargon penelitian yang diabaikan (*custom dictionary / ignore list*). |

### Engine Integration Options (Zero API Key)
1. **Default Mode (Public Endpoint):** Menggunakan endpoint gratis resmi `https://api.languagetool.org/v2/check` (tanpa registrasi atau API key).
2. **Optional Offline/Private Mode (Local Docker):** Dukungan konfigurasi URL lokal (`http://localhost:8010/v2/check`) bagi pengguna yang ingin menjalankan server LanguageTool di laptop sendiri demi privasi penuh naskah tesis.

---

## 3. UI/UX Specifications (Minimalist Split-Screen)

### 3.1. Visual Styling Rules
* **Color Palette:** Monokrom netral (`bg-white`, `bg-neutral-50`, `text-neutral-900`, `border-neutral-200`).
* **Error Highlighting (Soft & Clear):**
  * Kesalahan Tata Bahasa (*Grammar*): Garis bawah merah tipis (`decoration-red-500 underline decoration-wavy`).
  * Kesalahan Ejaan / Tanda Baca (*Typography / Punctuation*): Garis bawah kuning/amber tipis (`decoration-amber-500 underline`).
* **No AI Distractions:** Tidak ada tombol *"Rewrite"*, *"Make it formal"*, atau *"Paraphrase"*.

### 3.2. Layout Structure
1. **Top Bar:**
   * Judul aplikasi: `Academic Proofreader`
   * Pilihan dialek bahasa Inggris: `English (US)` / `English (UK)`
   * Statistik ringkas di kanan: `Jumlah Kata` | `Jumlah Koreksi Ditemukan` | Tombol teks `[ Salin Hasil ]`
2. **Left Panel (60% Width - Writing Canvas):**
   * Area penulisan luas dengan font serif/sans-serif yang nyaman untuk membaca paragraf panjang (*line-height* lega, maksimal lebar karakter ~75ch).
   * Teks yang memiliki kesalahan diberi garis bawah interaktif; jika diklik, kartu penjelasan di panel kanan otomatis tersorot (*scroll-into-view*).
3. **Right Panel (40% Width - Correction & Explanation Feed):**
   * Daftar vertikal kartu kesalahan yang diurutkan dari atas ke bawah sesuai posisi teks.
   * Setiap kartu menampilkan:
     1. **Kategori Kaidah:** (misal: *Subject-Verb Agreement*, *Article Usage*, *Punctuation*).
     2. **Perbandingan Singkat:** `kata salah` $\rightarrow$ **`kata perbaikan`**
     3. **Penjelasan Edukatif:** Kalimat penjelasan kaidah bahasa mengapa bentuk awal keliru.
     4. **Aksi Pengguna:** Tombol teks `[ Terapkan ]` (mengganti kata di editor) dan `[ Abaikan ]` (menghapus sorotan jika kata tersebut adalah istilah khusus/jargon penelitian).

---

## 4. Functional Requirements & Workflow

1. **Text Analysis Trigger:**
   * Pengguna menempelkan (*paste*) atau mengetik paragraf tesis ke panel kiri, lalu menekan tombol `[ Periksa Tata Bahasa ]` (atau otomatis berjalan dengan *debounce* 1.5 detik setelah berhenti mengetik).
2. **LanguageTool Request Formatting:**
   * Backend/Frontend mengirimkan HTTP `POST` dengan `Content-Type: application/x-www-form-urlencoded`:
     * `text`: Teks naskah pengguna.
     * `language`: `en-US` atau `en-GB`.
     * `enabledOnly`: `false`.
3. **Offset-Based Replacement Engine:**
   * Saat pengguna menekan `[ Terapkan ]` pada satu kartu perbaikan, aplikasi mengganti substring berdasarkan `offset` dan `length` secara presisi tanpa mengubah satu huruf pun di bagian kalimat lainnya.
   * Secara otomatis menghitung ulang (*recalculate*) posisi `offset` kartu-kartu kesalahan berikutnya agar tidak bergeser.
4. **Custom Academic Jargon Ignore List:**
   * Menyediakan fitur `[ Abaikan Istilah Ini ]` untuk istilah akademik, nama variabel, atau singkatan teknis agar tidak terus-menerus ditandai sebagai *typo*.

---

## 5. API Response Mapping Example

Contoh struktur data mentah dari LanguageTool yang dipetakan menjadi kartu penjelasan di UI:

```json
{
  "matches": [
    {
      "message": "The plural noun 'results' does not agree with the verb 'shows'.",
      "shortMessage": "Subject-verb agreement",
      "offset": 4,
      "length": 13,
      "replacements": [
        { "value": "results show" }
      ],
      "rule": {
        "id": "PLURAL_VERB_AFTER_THIS",
        "category": {
          "id": "GRAMMAR",
          "name": "Grammar"
        }
      }
    }
  ]
}
```

---

## 6. Implementation Roadmap

1. **Step 1 - Setup Halaman & Layout Split-Screen:**
   * Buat halaman utama `/` (atau `/proofreader`) dengan pembagian dua kolom monokromatik bersih tanpa dekorasi ikon.
2. **Step 2 - Integrasi Endpoint LanguageTool:**
   * Buat fungsi pemanggil API `https://api.languagetool.org/v2/check` (lengkap dengan opsi pengaturan URL lokal di modal setelan jika pengguna memakai Docker).
3. **Step 3 - Interactive Text Highlighter & Offset Updater:**
   * Implementasikan rendering sorotan garis bawah pada teks di panel kiri dan sinkronisasi klik dengan kartu penjelasan di panel kanan.
   * Pastikan fungsi penggantian kata (`Apply Fix`) memperbarui indeks karakter secara akurat.
4. **Step 4 - Export & Jargon Whitelist:**
   * Tambahkan fitur simpan daftar kata yang diabaikan ke `localStorage` dan tombol satu klik untuk menyalin teks final yang sudah bersih.