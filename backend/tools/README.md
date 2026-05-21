# VCE Analysis Tools

Kumpulan script untuk menganalisis dan mencoba parsing file `.vce`.

## 1. vce_investigator.py

Script aman untuk menginspeksi struktur internal file VCE tanpa mengubah isinya. Script ini akan membantu kita memahami apakah file VCE tertentu menggunakan enkripsi standar SQLite atau format custom lainnya.

### Cara Penggunaan:
1. Pastikan Python sudah terinstall.
2. Jalankan perintah berikut di terminal:
   ```bash
   python vce_investigator.py "path/to/your/exam.vce"
   ```

### Output:
Script akan menampilkan:
- Hex dump header file
- Deteksi format (SQLite/Zip/Unknown)
- Tingkat entropy (untuk deteksi enkripsi)
- String yang terbaca (jika ada)

## 2. pdf_exam_parser.py

Script cerdas untuk mengekstrak soal, pilihan ganda, dan kunci jawaban (jika terdeteksi) dari file PDF hasil "Print to PDF".

### Cara Penggunaan:
1. Pastikan library terinstall: `pip install pdfplumber`.
2. Jalankan perintah:
   ```bash
   python pdf_exam_parser.py "path/to/exam.pdf" "output.json"
   ```
3. File JSON yang dihasilkan siap diupload ke VirtualExamp (pilih format "OEF / JSON").

### Fitur Deteksi:
- Mendeteksi soal numerik (1., Q1, Question 1)
- Mendeteksi opsi (A., B., (A), (a))
- Mencoba auto-detect kunci jawaban (Correct Answer: B)

