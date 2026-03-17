/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Markdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { 
  BookOpen, Users, FileText, Book, Award, Sparkles, Loader2, GraduationCap, 
  Printer, Download, Plus, Edit2, Trash2, Gamepad2, Upload, FileSpreadsheet, 
  Info, X, LayoutDashboard, Settings, Calendar, Map, CheckSquare, Square, 
  FileQuestion, Menu, Save, Key, CheckCircle2, Maximize, Minimize, Database, 
  Search, Filter, Instagram, Youtube, Facebook, MessageCircle, Share2, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export interface Student {
  id: string;
  nisn: string;
  nama: string;
  jk: 'L' | 'P';
  gayaBelajar: 'Visual' | 'Auditori' | 'Kinestetik';
  kemampuan: 'Cakap' | 'Dasar' | 'Perlu Bimbingan';
  minat?: string;
  kse?: string;
}

export interface AppStats {
  bankSoal: number;
  modulAjar: number;
}

export interface JurnalEntry {
  id: string;
  tanggal: string;
  jamKe: string;
  kelas: string;
  mapel: string;
  materi: string;
  tujuanPembelajaran: string;
  kegiatanMindful?: string;
  kegiatanMeaningful?: string;
  kegiatanJoyful?: string;
  asesmen?: string;
  siswaAbsen: string[];
  refleksi: string;
  refleksiGuru?: string;
}

export interface TujuanPembelajaran {
  id: string;
  mapel: string;
  kelas: string;
  teks: string;
}

// Custom Hook untuk LocalStorage (Bikin kode bersih tanpa banyak useEffect)
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return saved as unknown as T;
      }
    }
    return initialValue;
  });

  useEffect(() => {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue];
}

// Utility to clean AI output artifacts
const cleanAIOutput = (text: string) => {
  return text
    .replace(/```html\n?|```\n?|```/g, '') // Remove code blocks
    .replace(/^json\s*\[/i, '[') // Remove "json [" prefix
    .replace(/\]\s*$/i, ']') // Ensure trailing bracket
    .trim();
};

export default function App() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // Anti-Maling Logic
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Splash timeout
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, []);
  
  // API Key State
  const [apiKey, setApiKey] = useLocalStorage('geminiApiKey', process.env.GEMINI_API_KEY || '');

  const fillTemplateCPTP = () => {
    setMapel('Matematika');
    setJenjang('SD');
    setKelas('B');
    setCpATP('Pada akhir fase B, murid menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000. Murid dapat membaca dan menulis; membandingkan dan mengurutkan bilangan; menentukan dan menggunakan nilai tempat; melakukan komposisi dan dekomposisi bilangan cacah sampai 10.000. Murid dapat melakukan dan menyelesaikan masalah operasi bilangan penjumlahan dan pengurangan bilangan cacah sampai 1.000, melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol. Murid mengenal kelipatan dan faktor.');
    setTujuanPembelajaran('1. menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000.\n2. membaca, dan menulis bilangan cacah sampai 10.000.\n3. membandingkan dan mengurutkan bilangan cacah sampai 10.000.\n4. menentukan dan menggunakan nilai tempat.\n5. melakukan komposisi dan dekomposisi bilangan cacah sampai 10.000\n6. melakukan dan menyelesaikan masalah operasi bilangan penjumlahan dan pengurangan bilangan cacah sampai 1.000\n7. melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol\n8. mengenal kelipatan dan faktor.');
  };

  // State Pengaturan Sekolah
  const [jenjang, setJenjang] = useLocalStorage('jenjang', 'SD');
  const [tahunAjaran, setTahunAjaran] = useLocalStorage('tahunAjaran', '2025/2026');
  const [namaSekolah, setNamaSekolah] = useLocalStorage('namaSekolah', 'SDN 1 Contoh');
  const [npsn, setNpsn] = useLocalStorage('npsn', '');
  const [namaGuru, setNamaGuru] = useLocalStorage('namaGuru', 'Deni Ranoptri, M.Pd.');
  const [nipGuru, setNipGuru] = useLocalStorage('nipGuru', '');
  const [namaKepsek, setNamaKepsek] = useLocalStorage('namaKepsek', 'Erna Suhriah, S.Pd., MM');
  const [nipKepsek, setNipKepsek] = useLocalStorage('nipKepsek', '197411092008012017');
  const [semester, setSemester] = useLocalStorage('semester', 'Ganjil');

  // App Stats & Data
  const [stats, setStats] = useLocalStorage<AppStats>('appStats', { bankSoal: 0, modulAjar: 0 });
  const [students, setStudents] = useLocalStorage<Student[]>('students', []);
  const [jurnals, setJurnals] = useLocalStorage<JurnalEntry[]>('jurnals', []);
  const [tujuanPembelajarans, setTujuanPembelajarans] = useLocalStorage<TujuanPembelajaran[]>('tujuanPembelajarans', []);
  const [showTPModal, setShowTPModal] = useState(false);
  const [selectedTPIds, setSelectedTPIds] = useState<string[]>([]);
  const [tpSearch, setTpSearch] = useState('');
  const [tpFilterMapel, setTpFilterMapel] = useState('Semua');
  const [tpFilterKelas, setTpFilterKelas] = useState('Semua');

  const handleDeleteTP = (id: string) => {
    setTujuanPembelajarans(prev => prev.filter(tp => tp.id !== id));
    setSelectedTPIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert('File CSV kosong atau format tidak valid.');
        return;
      }

      const newTps: TujuanPembelajaran[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split by comma or semicolon, handle basic quotes
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator).map(col => col.replace(/^"|"$/g, '').trim());
        
        if (cols.length >= 3) {
          newTps.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            mapel: cols[0],
            kelas: cols[1],
            teks: cols[2]
          });
        }
      }

      if (newTps.length > 0) {
        setTujuanPembelajarans(prev => [...newTps, ...prev]);
        alert(`Berhasil mengimpor ${newTps.length} Tujuan Pembelajaran!`);
      } else {
        alert('Tidak ada data yang valid untuk diimpor. Pastikan format kolom: Mata Pelajaran, Kelas, Tujuan Pembelajaran.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplySelectedTPs = () => {
    const selectedTPs = tujuanPembelajarans.filter(tp => selectedTPIds.includes(tp.id));
    if (selectedTPs.length > 0) {
      const combinedText = selectedTPs.map(tp => tp.teks).join('\n');
      setTujuanPembelajaran(prev => prev ? `${prev}\n${combinedText}` : combinedText);
      
      // Auto-fill mapel and kelas from the first selected TP if they are empty
      if (!mapel && selectedTPs[0].mapel) setMapel(selectedTPs[0].mapel);
      if (!kelas && selectedTPs[0].kelas) setKelas(selectedTPs[0].kelas);
    }
    setShowTPModal(false);
    setSelectedTPIds([]);
  };

  // State Fullscreen
  const [isFullscreenBankSoal, setIsFullscreenBankSoal] = useState(false);
  const [isFullscreenModulAjar, setIsFullscreenModulAjar] = useState(false);
  const [isGlobalFullscreen, setIsGlobalFullscreen] = useState(false);

  const toggleGlobalFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsGlobalFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsGlobalFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsGlobalFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // State Bank Soal
  const [jenisAsesmen, setJenisAsesmen] = useState('Sumatif Akhir Semester');
  const [mapel, setMapel] = useState(() => localStorage.getItem('lastMapel') || '');
  const [cp, setCp] = useState('');
  const [jumlahPG, setJumlahPG] = useState('10');
  const [jumlahIsian, setJumlahIsian] = useState('5');
  const [jumlahUraian, setJumlahUraian] = useState('5');
  const [karakterSoal, setKarakterSoal] = useState('Dominan HOTS');
  const [butuhGambar, setButuhGambar] = useState('Tidak');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  // State Modul Ajar AI
  const [jenisPerangkat, setJenisPerangkat] = useState('MODUL AJAR');
  const [alokasiWaktu, setAlokasiWaktu] = useState('2 x 45 Menit');
  const [materiModul, setMateriModul] = useState(() => localStorage.getItem('lastMateri') || '');
  const [topik, setTopik] = useState('');
  const [kelas, setKelas] = useState(() => localStorage.getItem('lastKelas') || '');
  const [jumlahPertemuan, setJumlahPertemuan] = useState('1');
  const [dimensiProfil, setDimensiProfil] = useState<string[]>([]);
  const [mitraPembelajaran, setMitraPembelajaran] = useState('');
  const [lingkunganBelajar, setLingkunganBelajar] = useState('');
  const [pemanfaatanDigital, setPemanfaatanDigital] = useState('');
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState(() => localStorage.getItem('lastTP') || '');
  const [cpATP, setCpATP] = useState('');
  const [butuhGambarModul, setButuhGambarModul] = useState('Tidak');

  const [loadingModul, setLoadingModul] = useState(false);
  const [resultModul, setResultModul] = useState('');
  const resultModulRef = useRef<HTMLDivElement>(null);

  // Data Siswa State
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState<Partial<Student>>({});

  // Jurnal State
  const [showJurnalForm, setShowJurnalForm] = useState(false);
  const [jurnalForm, setJurnalForm] = useState<Partial<JurnalEntry>>({});

  // Rapor Digital State
  const [grades, setGrades] = useLocalStorage<Record<string, {formatif: string, sumatif: string, deskripsi: string}>>('rapor_grades', {});
  const [loadingRaporId, setLoadingRaporId] = useState<string | null>(null);
  const [isFaseA, setIsFaseA] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  // Storage Management Logic
  const [storageUsage, setStorageUsage] = useState(0);
  const calculateStorageUsage = useCallback(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (localStorage.getItem(key)?.length || 0) * 2; // Approx bytes (UTF-16)
      }
    }
    setStorageUsage(total);
  }, []);

  useEffect(() => {
    calculateStorageUsage();
  }, [calculateStorageUsage, students, jurnals, tujuanPembelajarans, grades, apiKey]);

  const clearStorageCategory = (category: string) => {
    if (confirm(`Yakin ingin menghapus semua data ${category}? Tindakan ini tidak dapat dibatalkan.`)) {
      switch (category) {
        case 'TP': setTujuanPembelajarans([]); break;
        case 'Siswa': setStudents([]); break;
        case 'Jurnal': setJurnals([]); break;
        case 'Nilai Rapor': setGrades({}); break;
        case 'Semua':
          localStorage.clear();
          window.location.reload();
          break;
      }
      calculateStorageUsage();
    }
  };

  const handleSaveSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const checkApiKey = () => {
    if (!apiKey.trim()) {
      alert("API Key Gemini belum diatur! Silakan masukkan API Key di menu Pengaturan Sekolah terlebih dahulu agar AI bisa bekerja.");
      setActiveMenu('Pengaturan Sekolah');
      return false;
    }
    return true;
  };

  // Proses Gambar AI (DRY Principle)
  const processImagesInRef = useCallback(async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current || !apiKey) return;
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const images = ref.current.querySelectorAll('img.imagen-generator');
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLImageElement;
      if (img.getAttribute('data-processed') === 'true') continue;
      
      img.setAttribute('data-processed', 'true');
      const prompt = img.getAttribute('alt');
      
      if (prompt) {
        img.src = 'https://placehold.co/600x400/f8f9fa/5c6bc0?text=Membuat+Ilustrasi...';
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
          const resultObj = await model.generateContent(prompt);

          let base64Image = '';
          const parts = resultObj.response.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              base64Image = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }

          if (base64Image) {
            img.src = base64Image;
            img.removeAttribute('alt');
          } else {
            throw new Error('Gambar tidak ditemukan');
          }
        } catch (error) {
          console.error("Gagal bikin gambar:", error);
          img.src = 'https://placehold.co/600x400/f8f9fa/ef4444?text=Gagal+Membuat+Gambar';
        }
      }
    }
  }, [apiKey]);

  useEffect(() => {
    if (result) processImagesInRef(resultRef);
  }, [result, processImagesInRef]);

  useEffect(() => {
    if (resultModul) processImagesInRef(resultModulRef);
  }, [resultModul, processImagesInRef]);

  const generateSoal = async () => {
    if (!checkApiKey()) return;
    if (!mapel.trim() || !cp.trim()) {
      alert('Mohon isi Mata Pelajaran dan Capaian Pembelajaran.');
      return;
    }

    setLoading(true);
    setResult('');
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    try {
      const prompt = `Kamu adalah Pakar Evaluasi Pendidikan Kurikulum Merdeka tingkat nasional dan Senior Front-End Web Developer kelas dunia.

TUGAS UTAMA:
Menerima input pengguna ([JENIS ASESMEN], [JENJANG], [MATA PELAJARAN], [TAHUN AJARAN], [NAMA SEKOLAH], [NAMA GURU], [CP/TP/MATERI], [JUMLAH PG/ISIAN/URAIAN], [KARAKTER SOAL], [BUTUH GAMBAR]) dan menghasilkan dokumen asesmen komprehensif HANYA dalam format KODE HTML MURNI yang bergaya elegan, minimalis, dan siap cetak (print-ready) menggunakan CSS internal.

INPUT:
- Jenis Asesmen: ${jenisAsesmen}
- Jenjang: ${jenjang}
- Kelas: ${kelas}
- Mata Pelajaran: ${mapel}
- Capaian Pembelajaran (CP) / Materi: ${cp}
- Jumlah PG: ${jumlahPG}
- Jumlah Isian: ${jumlahIsian}
- Jumlah Uraian: ${jumlahUraian}
- Tahun Ajaran: ${tahunAjaran}
- Semester: ${semester}
- Nama Sekolah: ${namaSekolah}
- NPSN: ${npsn || '-'}
- Nama Guru: ${namaGuru}
- NIP Guru: ${nipGuru || '-'}
- Nama Kepsek: ${namaKepsek}
- NIP Kepsek: ${nipKepsek || '-'}
- Karakter Soal: ${karakterSoal}
- Butuh Gambar: ${butuhGambar}

ATURAN NASKAH SOAL (PENTING!):
Naskah soal harus dibagi menjadi beberapa bagian sesuai jumlah input yang diberikan pengguna:
- Jika Jumlah PG > 0, buat "A. PILIHAN GANDA" (sediakan opsi A, B, C, D).
- Jika Jumlah Isian > 0, buat "B. ISIAN SINGKAT" (berikan ruang titik-titik untuk menjawab).
- Jika Jumlah Uraian > 0, buat "C. URAIAN / ESSAY" (berikan ruang kosong yang luas untuk menjawab).

ATURAN KONTEN & PEDAGOGIK:
1. Sesuaikan tingkat kesulitan dan diksi dengan jenjang ${jenjang}. Untuk PAUD/SD Kelas Bawah, gunakan bahasa Concrete/Sederhana.
2. Wajib gunakan tahun ajaran ${tahunAjaran} dari input pengguna secara akurat di header dokumen.
3. KENDALI TAKSONOMI BLOOM & AKM (PENTING!): Kamu WAJIB meracik tingkat kesulitan soal berdasarkan parameter Karakter Soal (${karakterSoal}). 
   - Jika "DOMINAN HOTS", pastikan rumusan soal berbentuk studi kasus, analisis fenomena, atau pemecahan masalah (Level L3: C4, C5, C6).
   - Jika "DASAR / LOTS", buat soal seputar definisi, ciri-ciri, dan pemahaman konsep langsung (Level L1/L2: C1, C2, C3).
   - Jika "CAMPURAN PROPORSIONAL", kombinasikan LOTS dan HOTS secara seimbang.
   - Jika "CATs (Minute Paper / Exit Ticket)", buat instrumen asesmen formatif cepat (Halaman 55 PPA 2025) seperti Minute Paper (1 hal terpenting yang dipelajari), Muddiest Point (hal paling membingungkan), atau Exit Ticket (pertanyaan refleksi sebelum pulang).
   - Pastikan kode Taksonomi Bloom (Contoh: C4 - Menganalisis) tertulis jelas di tabel Kisi-kisi dan Kartu Soal.
4. FORMAT AKM (ASESMEN KOMPETENSI MINIMUM): Setiap soal (terutama PG dan Uraian) HARUS didahului dengan STIMULUS berupa teks bacaan kontekstual, studi kasus, tabel, atau infografis singkat yang relevan dengan kehidupan nyata (Meaningful Assessment). Jangan buat soal hafalan kering tanpa konteks.
5. JANGAN tambahkan kolom/baris tanda tangan untuk orang tua/wali maupun guru di bagian bawah naskah soal.

ATURAN DESAIN (STRICT HTML & CSS):
1. JANGAN gunakan format markdown seperti \`\`\`html. Langsung berikan kode HTML murni dimulai dari tag div atau style.
2. Gunakan CSS internal bergaya Modern/Minimalis (Font Sans-Serif, Spasi Lega, Warna Soft).
3. Gunakan tag <div style="page-break-after: always;"></div> untuk memisahkan bagian dokumen.
4. WAJIB gunakan atribut border="1" style="border-collapse: collapse; width: 100%;" pada semua tag <table> agar rapi saat di-export ke Word.
5. Gunakan tag HTML semantik standar (<ol>, <ul>, <li>, <strong>, <p>) agar tata letak rapi.

ATURAN KHUSUS JIKA [BUTUH GAMBAR] = "YA" (Sangat Detail):
Ini adalah aturan krusial untuk fitur "Bener-bener Bikin Gambar". Gemini, kamu tidak bisa melukis, tapi kamu harus menulis tag <img> dengan parameter khusus yang akan dibaca oleh website.

Setiap kali ada soal atau pilihan jawaban yang membutuhkan gambar, kamu WAJIB menulis tag <img> dengan format berikut:
<img class="imagen-generator" src="" alt="PROMPT DESKRIPSI GAMBAR YANG SUPER DETAIL DI SINI" data-location="QUESTION atau OPTION-A atau OPTION-B, dst">

Aturan Prompt Deskripsi Gambar (di dalam 'alt'):
- JANGAN nulis prompt sederhana (misal: "Gambar Katak").
- WAJIB buat prompt mendetail gaya profesional agar Imagen API menghasilkan gambar berkualitas tinggi (misal: "Micro-macro professional photography of the metamorphosis of a frog, showing egg, tadpole, young frog with legs, and adult frog on a lotus leaf. Natural lighting, shallow depth of field, National Geographic style, high resolution.")
- Jika pilihan jawaban butuh gambar, buat deskripsi spesifik untuk tiap opsi (misal: Opsi A: "Ilustrasi bentuk daun menjari yang tajam", Opsi B: "Ilustrasi bentuk daun menyirip yang detail").

STRUKTUR DOKUMEN WAJIB (Harus berurutan):

BAGIAN 1: KISI-KISI PENULISAN SOAL
- Header: "${jenisAsesmen}"
- Di bawahnya WAJIB gunakan data ini: "${namaSekolah} | Tahun Ajaran: ${tahunAjaran}"
- Tabel Kisi-kisi.
- Di bagian bawah tabel kisi-kisi, tambahkan pengesahan: Gunakan tabel <table class="ttd-table"><tr><td>Mengetahui,<br>Kepala Sekolah<br><div class="ttd-space"></div><b>${namaKepsek}</b><br>NIP. ${nipKepsek || '.........................'}</td><td>Guru Mata Pelajaran<br><div class="ttd-space"></div><b>${namaGuru}</b><br>NIP. ${nipGuru || '.........................'}</td></tr></table>.

<div style="page-break-after: always;"></div>

BAGIAN 2: NASKAH SOAL SIAP CETAK
- Buat header besar (center): "${jenisAsesmen}"
- Di bawah judul WAJIB tulis: "${namaSekolah}"
- Identitas form siswa: Mata Pelajaran, Tahun Ajaran, Nama Siswa, Kelas, No. Absen.
- Tuliskan soal sesuai komposisi (Bagian A, B, dan C) secara berurutan.

<div style="page-break-after: always;"></div>

BAGIAN 3: KARTU SOAL
- Buat kartu soal untuk semua butir soal yang di-generate.
- Header Kartu WAJIB menggunakan: "${namaSekolah}"
- Di dalam kartu, cantumkan "Penyusun: ${namaGuru}".
- Di bagian akhir seluruh kartu soal, tambahkan pengesahan: Gunakan tabel <table class="ttd-table"><tr><td>Mengetahui,<br>Kepala Sekolah<br><div class="ttd-space"></div><b>${namaKepsek}</b><br>NIP. ${nipKepsek || '.........................'}</td><td>Guru Mata Pelajaran<br><div class="ttd-space"></div><b>${namaGuru}</b><br>NIP. ${nipGuru || '.........................'}</td></tr></table>.`;

      const resultObj = await model.generateContent(prompt);
      const responseText = resultObj.response.text();

      setResult(cleanAIOutput(responseText || 'Gagal menghasilkan soal.'));
      setStats(prev => ({ ...prev, bankSoal: prev.bankSoal + 1 }));
    } catch (error: any) {
      console.error('Error generating questions:', error);
      if (error?.message?.includes('429') || error?.status === 429 || String(error).includes('429')) {
        setResult('Kuota AI penuh, silakan tunggu 1 menit.');
      } else {
        setResult(`Terjadi kesalahan saat menghubungi AI: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    
    let htmlContent = ref.current.innerHTML;
    
    let styleBlocks = '';
    htmlContent = htmlContent.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, p1) => {
      styleBlocks += p1 + '\n';
      return '';
    });

    htmlContent = htmlContent.replace(/<div[^>]*style="[^"]*page-break-after:\s*always[^"]*"[^>]*>.*?<\/div>/gi, '<br clear="all" style="page-break-before:always" />');

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export HTML to Word Document</title>
        <style>
          @page WordSection1 {
            size: 8.27in 11.69in; /* A4 */
            margin: 1in 1in 1in 1in;
            mso-header-margin: .5in;
            mso-footer-margin: .5in;
            mso-paper-source: 0;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            color: black;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
          }
          table, th, td {
            border: 1px solid black;
          }
          th, td {
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          tr {
            page-break-inside: avoid;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          h1, h2, h3, h4 {
            text-align: center;
            color: black;
          }
          ${styleBlocks}
        </style>
      </head>
      <body>
        <div class="WordSection1">
    `;
    const footer = "</div></body></html>";
    
    const sourceHTML = header + htmlContent + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = filename;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
  };

  const generateModul = async () => {
    if (!checkApiKey()) return;
    
    if (!mapel) {
      alert('Mohon isi Mata Pelajaran.');
      return;
    }
    if (['ALUR TUJUAN PEMBELAJARAN', 'PROTA DAN PROMES'].includes(jenisPerangkat) && !cpATP) {
      alert('Mohon isi Capaian Pembelajaran (CP) / Lingkup Materi.');
      return;
    }
    if (!['ALUR TUJUAN PEMBELAJARAN', 'PROTA DAN PROMES', 'MODUL KO-KURIKULER', 'ASESMEN AWAL'].includes(jenisPerangkat) && !materiModul) {
      alert('Mohon isi Materi Pokok.');
      return;
    }
    if (jenisPerangkat === 'MODUL KO-KURIKULER' && !topik) {
      alert('Mohon isi Tema/Topik Ko-Kurikuler.');
      return;
    }

    // Simpan ke local history untuk Form Jurnal Mengajar
    localStorage.setItem('lastMapel', mapel);
    localStorage.setItem('lastKelas', kelas);
    localStorage.setItem('lastMateri', materiModul);
    localStorage.setItem('lastTP', tujuanPembelajaran);

    setLoadingModul(true);
    setResultModul('');
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    try {
      let studentContext = '';
      if (students.length > 0) {
        const visualCount = students.filter(s => s.gayaBelajar === 'Visual').length;
        const auditoriCount = students.filter(s => s.gayaBelajar === 'Auditori').length;
        const kinestetikCount = students.filter(s => s.gayaBelajar === 'Kinestetik').length;
        
        const cakapCount = students.filter(s => s.kemampuan === 'Cakap').length;
        const dasarCount = students.filter(s => s.kemampuan === 'Dasar').length;
        const perluBimbinganCount = students.filter(s => s.kemampuan === 'Perlu Bimbingan').length;

        const minatList = Array.from(new Set(students.map(s => s.minat).filter(Boolean))).join(', ');
        const kseList = Array.from(new Set(students.map(s => s.kse).filter(Boolean))).join(', ');

        studentContext = `
INFORMASI KELAS (PEMBELAJARAN BERDIFERENSIASI & DEEP LEARNING):
- Total Siswa: ${students.length}
- Gaya Belajar: ${visualCount} Visual, ${auditoriCount} Auditori, ${kinestetikCount} Kinestetik.
- Tingkat Kemampuan: ${cakapCount} Cakap, ${dasarCount} Dasar, ${perluBimbinganCount} Perlu Bimbingan.
${minatList ? `- Minat Siswa: ${minatList}.` : ''}
${kseList ? `- Kondisi Sosial Emosional (KSE): ${kseList}.` : ''}

PENTING: Karena ini adalah kelas dengan karakteristik di atas, WAJIB sertakan strategi Pembelajaran Berdiferensiasi (Konten, Proses, dan Produk) yang secara spesifik mengakomodasi gaya belajar, minat, dan tingkat kemampuan tersebut di dalam kegiatan pembelajaran (Meaningful Learning). Serta sesuaikan kegiatan apersepsi (Mindful Learning) dengan Kondisi Sosial Emosional (KSE) siswa.
`;
      }

      const prompt = `Kamu adalah Pakar Kurikulum Nasional dari Kementerian Pendidikan Dasar dan Menengah (Kemendikdasmen) dan Desainer Instruksional tingkat lanjut yang spesialis dalam merancang perangkat ajar berbasis "Pembelajaran Mendalam" (Deep Learning: Mindful, Meaningful, Joyful).

TUGAS UTAMA:
Menerima parameter input pengguna dan menghasilkan dokumen perangkat ajar berupa ${jenisPerangkat} HANYA dalam format KODE HTML MURNI yang bergaya elegan, profesional, dan siap cetak (print-ready A4) menggunakan CSS internal. Output WAJIB sesuai dengan panduan resmi dan format baku dari Kementerian Pendidikan Dasar dan Menengah.

PARAMETER INPUT:
- JENIS PERANGKAT: ${jenisPerangkat}
- JENJANG/FASE: ${jenjang}
- KELAS: ${kelas}
- MATA PELAJARAN: ${mapel}
${jenisPerangkat === 'ALUR TUJUAN PEMBELAJARAN' ? `- CAPAIAN PEMBELAJARAN (CP): ${cpATP}` : `- SEMESTER: ${semester}
- TOPIK: ${topik}
- MATERI POKOK: ${materiModul}
- JUMLAH PERTEMUAN: ${jumlahPertemuan}
- DURASI/ALOKASI WAKTU: ${alokasiWaktu}
- DIMENSI PROFIL LULUSAN: ${dimensiProfil.length > 0 ? dimensiProfil.join(', ') : 'Pilih yang relevan'}
- TUJUAN PEMBELAJARAN: ${tujuanPembelajaran}
- BUTUH GAMBAR/ILUSTRASI: ${butuhGambarModul}`}
- TAHUN AJARAN: ${tahunAjaran}
- NAMA SEKOLAH: ${namaSekolah}
- NPSN: ${npsn || '-'}
- NAMA GURU: ${namaGuru}
- NIP GURU: ${nipGuru || '-'}
- NAMA KEPSEK: ${namaKepsek}
- NIP KEPSEK: ${nipKepsek || '-'}
${studentContext}

ATURAN BAHASA & PEDAGOGIK:
1. Analisis jenjang ${jenjang}. Jika inputnya adalah PAUD atau SD Kelas Bawah, gunakan bahasa dan aktivitas yang sangat konkret, interaktif, dan hindari istilah ilmiah berat.
2. Pastikan semua dokumen mencerminkan filosofi Kurikulum Merdeka Kemendikdasmen (berpusat pada siswa, Pembelajaran Mendalam, Dimensi Profil Lulusan).

ATURAN DESAIN (STRICT HTML & CSS):
1. JANGAN gunakan format markdown seperti \`\`\`html. Langsung berikan kode HTML murni dimulai dari tag div atau style.
2. Gunakan CSS internal yang modern, elegan, dan berwarna lembut namun tetap profesional untuk dicetak. Wajib sertakan CSS ini di awal:
   <style>
     .perangkat-container { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 100%; margin: 0 auto; }
     .modul-title { text-align: center; color: #0f172a; font-size: 20px; margin: 0 0 25px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
     .kop-surat { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #0f172a; padding-bottom: 10px; }
     .kop-surat h2 { margin: 0; font-size: 22px; text-transform: uppercase; }
     .kop-surat p { margin: 2px 0; font-size: 14px; }
     .section-title { background-color: #0f172a; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; font-size: 16px; margin: 30px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
     .section-content { border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; background: #ffffff; }
     table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
     th, td { border: 1px solid #cbd5e1; padding: 10px; vertical-align: top; }
     th { background-color: #f8fafc; color: #0f172a; font-weight: 600; text-align: center; }
     .tabel-skenario th { background-color: #0f172a; color: white; }
     .tahap-pendahuluan { background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 10px; margin-bottom: 10px; }
     .tahap-inti { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 10px; margin-bottom: 10px; }
     .tahap-penutup { background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 10px; margin-bottom: 10px; }
     .ttd-table { width: 100%; margin-top: 50px; border: none !important; }
     .ttd-table td { border: none !important; text-align: center; width: 50%; padding: 0; }
     .ttd-space { height: 80px; }
     .img-wrapper { text-align: center; margin: 20px 0; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; }
     img.imagen-generator { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
     .badge { display: inline-block; padding: 4px 8px; background: #f1f5f9; color: #0f172a; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 5px; margin-bottom: 5px; border: 1px solid #cbd5e1; }
     @media print { 
       .section-title { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
       .tabel-skenario th { background-color: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
       .tahap-pendahuluan, .tahap-inti, .tahap-penutup { background-color: transparent !important; }
       .perangkat-container { margin: 0; }
     }
   </style>
3. JIKA INPUT BUTUH GAMBAR/ILUSTRASI = "Ya": Wajib sisipkan 2-3 gambar ilustrasi materi atau kegiatan menggunakan tag <div class="img-wrapper"><img class="imagen-generator" alt="[Tulis prompt gambar detail dalam bahasa Inggris, contoh: A high quality clean vector illustration of students doing science experiment, flat design, educational style, 4k resolution, no text]" src="" /></div>. Biarkan atribut src kosong.
4. Page-break: Gunakan <div style="page-break-after: always;"></div> jika dokumen lebih dari satu halaman agar rapi saat dicetak.

ATURAN STRUKTUR BERDASARKAN JENIS PERANGKAT (FORMAT RESMI KEMENDIKDASMEN):

JIKA INPUT JENIS PERANGKAT = "MODUL AJAR":
Buat Modul Ajar Kurikulum Merdeka yang diintegrasikan dengan pendekatan "Pembelajaran Mendalam" (Deep Learning: Mindful, Meaningful, Joyful) sesuai standar terbaru Kemendikdasmen RI.
STRUKTUR DOKUMEN MODUL AJAR (WAJIB BERURUTAN):
1. HEADER: Gunakan <h1 class="modul-title">MODUL AJAR KURIKULUM MERDEKA<br><span style="font-size: 16px; color: #475569;">Pendekatan Pembelajaran Mendalam (Deep Learning)</span></h1>
2. INFORMASI UMUM: Gunakan div .section-title dan .section-content. Buat tabel 2 kolom untuk menyajikan:
   - Nama Penyusun: ${namaGuru}
   - Institusi: ${namaSekolah}
   - Tahun Ajaran: ${tahunAjaran}
   - Jenjang / Kelas / Semester: ${jenjang} / ${kelas} / ${semester}
   - Mata Pelajaran: ${mapel}
   - Alokasi Waktu: ${alokasiWaktu} (${jumlahPertemuan} Pertemuan)
   - Kompetensi Awal: (Tentukan berdasarkan materi ${materiModul})
   - Dimensi Profil Lulusan: ${dimensiProfil.length > 0 ? dimensiProfil.join(', ') : '(Pilih yang relevan)'}
   - Sarana dan Prasarana: (Tentukan sarpras yang sesuai)
   - Target Peserta Didik: Reguler/Tipikal (Sertakan diferensiasi jika ada data siswa)
   - Model Pembelajaran: (Pilih model yang relevan, misal: PBL, PjBL)
   - Kemitraan Pembelajaran: ${mitraPembelajaran || 'Mandiri (Guru & Murid)'}
   - Lingkungan Pembelajaran: ${lingkunganBelajar || 'Ruang Kelas Fisik'}
   - Pemanfaatan Teknologi Digital: ${pemanfaatanDigital || 'Alat bantu presentasi standar'}
3. KOMPONEN INTI: Gunakan div .section-title dan .section-content.
   - Tujuan Pembelajaran: ${tujuanPembelajaran || '(Berdasarkan materi: ' + materiModul + ')'}
   - Pemahaman Bermakna (Meaningful): (Jelaskan manfaat materi ini dalam kehidupan nyata siswa)
   - Pertanyaan Pemantik: (Buat 2-3 pertanyaan kritis untuk memancing rasa ingin tahu)
4. KEGIATAN PEMBELAJARAN (Gunakan tabel dengan class="tabel-skenario" berisi 3 kolom: Tahap | Deskripsi Kegiatan | Waktu):
   - PENDAHULUAN (Mindful Learning - Tahap Memahami): Fokus pada kesiapan belajar (readiness), kesadaran penuh (mindfulness), apersepsi yang menggugah, dan teknik STOP atau ice breaking yang relevan.
   - KEGIATAN INTI (Meaningful Learning - Tahap Mengaplikasi): Fokus pada kedalaman materi (bukan keluasan), eksplorasi konsep, pemecahan masalah nyata, kolaborasi aktif, dan unjuk kerja nyata.
   - PENUTUP (Joyful Learning - Tahap Merefleksi): Fokus pada perayaan belajar (celebration), refleksi metakognitif (apa yang dipelajari, bagaimana perasaan, apa rencana selanjutnya), apresiasi, dan penguatan emosional positif.
5. ASESMEN:
   - Asesmen Awal (Diagnostik): (Kognitif & Non-Kognitif)
   - Asesmen Proses (Formatif): (Observasi, Performa)
   - Asesmen Akhir (Sumatif): (Tes Tertulis/Proyek)
6. PENGAYAAN DAN REMEDIAL: (Jelaskan langkah operasionalnya)
7. REFLEKSI PESERTA DIDIK DAN GURU: (Buat tabel panduan refleksi)
8. LAMPIRAN: (Glosarium dan Daftar Pustaka)
9. PENGESAHAN: Gunakan tabel <table class="ttd-table"><tr><td>Mengetahui,<br>Kepala Sekolah<br><div class="ttd-space"></div><b>${namaKepsek}</b><br>NIP. ${nipKepsek || '.........................'}</td><td>Guru Mata Pelajaran<br><div class="ttd-space"></div><b>${namaGuru}</b><br>NIP. ${nipGuru || '.........................'}</td></tr></table>.

JIKA INPUT JENIS PERANGKAT = "KKTP":
Buat Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) format resmi Kemendikdasmen RI Edisi Revisi 2025.
1. HEADER: Kop Surat resmi berisi nama sekolah ${namaSekolah}, judul "KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)". Identitas Kelas/Fase, Mata Pelajaran, Tahun Ajaran.
2. PENDEKATAN: Gunakan variasi pendekatan (Pilih salah satu yang paling cocok: Deskripsi Kriteria, Rubrik, atau Interval Nilai).
3. TABEL KKTP: Sajikan indikator ketercapaian yang diturunkan dari Tujuan Pembelajaran (${tujuanPembelajaran || materiModul}).
4. TINDAK LANJUT: Berikan panduan intervensi bagi siswa yang belum mencapai kriteria (Remedial) dan yang sudah melampaui (Pengayaan).
5. LEMBAR PENGESAHAN: Sama seperti Modul Ajar.

JIKA INPUT JENIS PERANGKAT = "PROTA DAN PROMES":
Buat Program Tahunan (Prota) dan Program Semester (Promes) format resmi Kemendikdasmen RI yang mengintegrasikan pendekatan Pembelajaran Mendalam (Deep Learning).
1. KOP SURAT: Nama Sekolah ${namaSekolah}, Mata Pelajaran, Kelas/Fase, Tahun Ajaran.
2. ANALISIS MATERI: Pecah Capaian Pembelajaran (CP) atau Lingkup Materi yang diinputkan menjadi beberapa Tujuan Pembelajaran (TP) / Materi Pokok yang logis untuk 1 tahun (Prota) dan 1 semester (Promes).
3. PROGRAM TAHUNAN (PROTA): Buat tabel matriks (No, Tujuan Pembelajaran / Materi Pokok, Alokasi Waktu (JP), Semester). Pastikan total waktu sesuai dengan input alokasi waktu (${alokasiWaktu}). Berikan rincian TP yang mendalam untuk setiap lingkup materi.
4. PROGRAM SEMESTER (PROMES): Buat tabel matriks (No, Tujuan Pembelajaran / Materi Pokok, Alokasi Waktu (JP), Bulan (Juli s.d. Desember untuk Ganjil, Januari s.d. Juni untuk Genap), Keterangan). Rinci setiap minggu efektif.
5. INTEGRASI DEEP LEARNING: Pada kolom "Keterangan" di Promes, berikan catatan ringkas kapan guru harus menerapkan aktivitas *Mindful* (Kesiapan belajar), *Meaningful* (Eksplorasi/Proyek), dan *Joyful* (Refleksi/Perayaan belajar).
6. LEMBAR PENGESAHAN di akhir halaman.

JIKA INPUT JENIS PERANGKAT = "ALUR TUJUAN PEMBELAJARAN":
Buat dokumen Alur Tujuan Pembelajaran (ATP) resmi yang selaras dengan panduan Pembelajaran Mendalam (Deep Learning).
1. KOP SURAT: Nama Sekolah ${namaSekolah}, Mata Pelajaran, Kelas/Fase, Tahun Ajaran.
2. HEADER: Tambahkan sub-judul "Pendekatan Pembelajaran Mendalam (Mindful, Meaningful, Joyful)".
3. ANALISIS CP: Pecah paragraf Capaian Pembelajaran (CP) yang diberikan menjadi beberapa Tujuan Pembelajaran (TP) yang spesifik dan terukur.
4. TABEL ATP: Buat tabel matriks dengan kolom:
   - Capaian Pembelajaran (CP) (Isi dengan teks CP yang diinputkan)
   - Tujuan Pembelajaran (TP) (Hasil pecahan CP)
   - Kata Kerja Operasional (KKO) & Tingkat Kognitif (C1-C6)
   - Alur Tujuan Pembelajaran / Urutan
   - Alokasi Waktu (Estimasi proporsional)
   - Dimensi Profil Lulusan
5. FORMULASI TP: Tujuan Pembelajaran WAJIB dirumuskan menggunakan Kata Kerja Operasional (KKO) Taksonomi Bloom yang terukur. Susun alur secara logis dan hierarkis dari LOTS (Lower Order Thinking Skills: Mengingat C1, Memahami C2, Mengaplikasikan C3) menuju HOTS (Higher Order Thinking Skills: Menganalisis C4, Mengevaluasi C5, Mencipta C6).
6. Pastikan TP mencerminkan proses Pembelajaran Mendalam:
7. KHUSUS UNTUK ALUR TUJUAN PEMBELAJARAN: Di bagian paling akhir dokumen HTML, WAJIB tambahkan sebuah tag script berisi data JSON dari Tujuan Pembelajaran yang dihasilkan, dengan format persis seperti ini:
<script type="application/json" id="generated-tp-data">
[
  { "teks": "Siswa dapat menjelaskan...", "mapel": "${mapel}", "kelas": "${kelas}" },
  { "teks": "Siswa dapat menganalisis...", "mapel": "${mapel}", "kelas": "${kelas}" }
]
</script>

JIKA INPUT JENIS PERANGKAT = "MODUL KO-KURIKULER":
Buat Modul Ko-Kurikuler yang komprehensif sesuai PPA 2025 (Halaman 83).
1. KOP SURAT: Nama Sekolah ${namaSekolah}, Fase/Kelas, Tahun Ajaran.
2. PROFIL MODUL: Tema (${topik}), Topik Spesifik (${materiModul || topik}), Alokasi Waktu (${alokasiWaktu}).
3. TUJUAN: Pemetaan Dimensi Profil Lulusan (${dimensiProfil.join(', ')}), Elemen, dan Subelemen yang disasar.
4. ALUR KEGIATAN: Gunakan alur (Pengenalan, Kontekstualisasi, Aksi, Refleksi, Tindak Lanjut). Jelaskan aktivitas siswa pada tiap tahap secara mendalam (Deep Learning).
5. ASESMEN: Buat instrumen asesmen (Rubrik) untuk mengukur perkembangan Dimensi Profil Lulusan.

JIKA INPUT JENIS PERANGKAT = "INSTRUMEN REFLEKSI":
Buat instrumen refleksi pembelajaran sesuai PPA 2025 (Halaman 79).
1. KOP SURAT: Nama Sekolah ${namaSekolah}, Mata Pelajaran, Kelas/Fase, Materi Pokok.
2. REFLEKSI GURU: Buat 5-7 pertanyaan reflektif untuk guru (Cth: Apakah semua siswa mencapai tujuan? Apa tantangan terbesar hari ini?).
3. REFLEKSI SISWA: Buat 5-7 pertanyaan reflektif untuk siswa (Cth: Bagian mana yang paling kamu sukai? Apa yang masih membingungkan?).
4. REFLEKSI REKAN SEJAWAT: Buat lembar observasi singkat untuk rekan guru yang mengamati kelas.
5. Gunakan bahasa yang hangat dan mendukung (Joyful).

JIKA INPUT JENIS PERANGKAT = "ASESMEN AWAL":
Buat instrumen Asesmen Awal (Diagnostik Kognitif & Non-Kognitif) untuk materi ${materiModul} kelas ${kelas}.
1. KOP SURAT: Nama Sekolah ${namaSekolah}, Mata Pelajaran, Kelas/Fase, Materi Pokok.
2. KHUSUS KELAS 1 SD (TRANSISI PAUD-SD): Jika input kelas adalah "1" atau "I", fokuskan asesmen pada 6 Kemampuan Fondasi (Halaman 25 PPA 2025):
   - Mengenal nilai agama dan budi pekerti.
   - Kematangan emosi untuk berkegiatan.
   - Keterampilan sosial dan bahasa untuk berinteraksi.
   - Pemaknaan terhadap belajar yang positif.
   - Pengembangan keterampilan motorik dan perawatan diri.
   - Kematangan kognitif (literasi & numerasi dasar).
3. ASESMEN NON-KOGNITIF: Buat 3-5 pertanyaan/aktivitas santai untuk mengetahui gaya belajar, minat, dan kondisi sosial emosional (KSE).
4. ASESMEN KOGNITIF: Buat 3-5 pertanyaan pemantik atau soal dasar untuk materi ${materiModul}.
5. TINDAK LANJUT: Berikan panduan diferensiasi (Konten/Proses/Produk) berdasarkan hasil asesmen.
6. LEMBAR PENGESAHAN di akhir halaman.
Selain menghasilkan HTML, kamu WAJIB menambahkan blok JSON di bagian paling akhir response (setelah tag penutup HTML) dengan format persis seperti ini:
\`\`\`json
[
  {"teks": "Siswa dapat menjelaskan (C2) konsep A dengan benar"},
  {"teks": "Siswa mampu menganalisis (C4) hubungan B dan C"}
]
\`\`\`
Pastikan JSON ini valid dan berisi semua Tujuan Pembelajaran yang kamu buat dalam ATP tersebut.

JIKA INPUT JENIS PERANGKAT = "LKPD DAN BAHAN AJAR":
Buat dokumen Lembar Kerja Peserta Didik (LKPD) dan Bahan Ajar Kurikulum Merdeka yang mencerminkan Pembelajaran Mendalam (Deep Learning).
1. KOP SURAT: Nama Sekolah, Judul LKPD, Mata Pelajaran, Kelas/Fase, Nama Siswa/Kelompok.
2. TUJUAN PEMBELAJARAN: ${tujuanPembelajaran}
3. PETUNJUK BELAJAR: Berikan instruksi yang memancing kesadaran penuh (Mindful).
4. INFORMASI PENDUKUNG: Ringkasan materi singkat yang bermakna (Meaningful).
5. LANGKAH KERJA / TUGAS: Buat instruksi aktivitas pemecahan masalah atau proyek yang interaktif dan menyenangkan (Joyful).
6. RUANG JAWABAN: Sediakan area kosong (titik-titik atau kotak) untuk siswa menjawab.
7. RUBRIK PENILAIAN SINGKAT: Di bagian akhir LKPD untuk self-assessment siswa.`;

      const resultObj = await model.generateContent(prompt);
      let responseText = resultObj.response.text() || '';
      
      if (jenisPerangkat === 'ALUR TUJUAN PEMBELAJARAN') {
        const scriptMatch = responseText.match(/<script type="application\/json" id="generated-tp-data">([\s\S]*?)<\/script>/);
        const jsonMatch = scriptMatch ? scriptMatch[1] : (responseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/)?.[0]);
        
        if (jsonMatch) {
          try {
            const parsedTPs = JSON.parse(jsonMatch);
            if (Array.isArray(parsedTPs)) {
              const newTPs = parsedTPs.map((tp: any) => ({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                mapel: tp.mapel || mapel,
                kelas: tp.kelas || kelas,
                teks: tp.teks
              }));
              setTujuanPembelajarans(prev => {
                const existingTeks = new Set(prev.map(p => p.teks.toLowerCase()));
                const uniqueNewTPs = newTPs.filter((tp: any) => !existingTeks.has(tp.teks.toLowerCase()));
                return [...prev, ...uniqueNewTPs];
              });
            }
          } catch (e) {
            console.error("Gagal parse JSON TP:", e);
          }
          // Remove the JSON block from the display text
          responseText = responseText.replace(/<script type="application\/json" id="generated-tp-data">[\s\S]*?<\/script>/, '')
                                     .replace(/```json\s*[\s\S]*?\s*```/, '')
                                     .replace(/\[\s*\{[\s\S]*?\}\s*\]/, '');
        }
      }

      setResultModul(cleanAIOutput(responseText) || 'Gagal menghasilkan perangkat ajar.');
      setStats(prev => ({ ...prev, modulAjar: prev.modulAjar + 1 }));
    } catch (error: any) {
      console.error('Error generating modul:', error);
      if (error?.message?.includes('429') || error?.status === 429 || String(error).includes('429')) {
        setResultModul('Kuota AI penuh, silakan tunggu 1 menit.');
      } else {
        setResultModul(`Terjadi kesalahan saat menghubungi AI: ${error?.message || String(error)}`);
      }
    } finally {
      setLoadingModul(false);
    }
  };

  // Data Siswa Handlers
  const handleSaveStudent = () => {
    if (!studentForm.nisn || !studentForm.nama || !studentForm.jk || !studentForm.gayaBelajar || !studentForm.kemampuan) {
      alert('Mohon lengkapi semua data siswa.');
      return;
    }

    if (editingStudentId) {
      setStudents(students.map(s => s.id === editingStudentId ? { ...studentForm, id: editingStudentId } as Student : s));
    } else {
      setStudents([...students, { ...studentForm, id: Date.now().toString() } as Student]);
    }
    
    setShowStudentForm(false);
    setEditingStudentId(null);
    setStudentForm({});
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Yakin ingin menghapus data siswa ini?')) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

  const handleEditStudent = (student: Student) => {
    setStudentForm(student);
    setEditingStudentId(student.id);
    setShowStudentForm(true);
  };

  const handleDownloadTemplate = () => {
    const headers = "NISN,Nama Lengkap,Jenis Kelamin (L/P),Gaya Belajar (Visual/Auditori/Kinestetik),Tingkat Kemampuan (Cakap/Dasar/Perlu Bimbingan)\n";
    const sample1 = "0012345678,Budi Santoso,L,Visual,Cakap\n";
    const sample2 = "0012345679,Siti Aminah,P,Auditori,Dasar\n";
    const blob = new Blob([headers + sample1 + sample2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Template_Data_Siswa.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newStudents: Student[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [nisn, nama, jkRaw, gayaRaw, kemampuanRaw] = line.split(',');

        if (nisn && nama) {
          const jk = jkRaw?.trim().toUpperCase() === 'P' ? 'P' : 'L';
          
          let gayaBelajar: any = 'Visual';
          const g = gayaRaw?.trim().toLowerCase();
          if (g === 'auditori') gayaBelajar = 'Auditori';
          if (g === 'kinestetik') gayaBelajar = 'Kinestetik';

          let kemampuan: any = 'Cakap';
          const k = kemampuanRaw?.trim().toLowerCase();
          if (k === 'dasar') kemampuan = 'Dasar';
          if (k === 'perlu bimbingan') kemampuan = 'Perlu Bimbingan';

          newStudents.push({
            id: Date.now().toString() + i,
            nisn: nisn.trim(),
            nama: nama.trim(),
            jk,
            gayaBelajar,
            kemampuan
          });
        }
      }

      if (newStudents.length > 0) {
        setStudents([...students, ...newStudents]);
        alert(`Berhasil mengimpor ${newStudents.length} data siswa!`);
        setShowUploadModal(false);
      } else {
        alert('Gagal mengimpor data. Pastikan format CSV sesuai template.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handlers Jurnal Mengajar
  const openTambahJurnal = () => {
    setJurnalForm({
      tanggal: new Date().toISOString().split('T')[0],
      jamKe: '1-2',
      kelas: kelas || '',
      mapel: mapel || '',
      materi: materiModul || '',
      tujuanPembelajaran: tujuanPembelajaran || '',
      kegiatanMindful: 'Teknik STOP / Ice Breaking',
      kegiatanMeaningful: 'Diskusi Kelompok / Pemecahan Masalah',
      kegiatanJoyful: 'Refleksi Menyenangkan / Games',
      asesmen: 'Observasi / Formatif',
      siswaAbsen: [],
      refleksi: 'Pembelajaran berjalan lancar dan siswa antusias.'
    });
    setShowJurnalForm(true);
  };

  const simpanJurnal = () => {
    if (!jurnalForm.tanggal || !jurnalForm.mapel || !jurnalForm.materi) {
      alert('Tanggal, Mapel, dan Materi wajib diisi!');
      return;
    }
    const newJurnal = { ...jurnalForm, id: Date.now().toString() } as JurnalEntry;
    setJurnals([newJurnal, ...jurnals]);
    setShowJurnalForm(false);
  };

  const hapusJurnal = (id: string) => {
    if (confirm('Yakin ingin menghapus entri jurnal ini?')) {
      setJurnals(jurnals.filter(j => j.id !== id));
    }
  };

  const toggleAbsenSiswa = (namaSiswa: string) => {
    const currentAbsen = jurnalForm.siswaAbsen || [];
    if (currentAbsen.includes(namaSiswa)) {
      setJurnalForm({ ...jurnalForm, siswaAbsen: currentAbsen.filter(n => n !== namaSiswa) });
    } else {
      setJurnalForm({ ...jurnalForm, siswaAbsen: [...currentAbsen, namaSiswa] });
    }
  };

  const generateDeskripsiRapor = async (studentId: string) => {
    if (!checkApiKey()) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const studentGrade = grades[studentId] || { formatif: '', sumatif: '', deskripsi: '' };
    if (!studentGrade.formatif || !studentGrade.sumatif) {
      alert('Mohon isi Nilai Formatif dan Sumatif terlebih dahulu.');
      return;
    }

    setLoadingRaporId(studentId);
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    try {
      const prompt = `Kamu adalah Wali Kelas dan Guru Kurikulum Merdeka yang ahli dalam membuat deskripsi e-Rapor.
      
TUGAS:
Buat 1 paragraf naratif (maksimal 3-4 kalimat) deskripsi capaian kompetensi untuk rapor siswa berikut:
- Nama Siswa: ${student.nama}
- Nilai Rata-rata Formatif (Proses): ${studentGrade.formatif}
- Nilai Sumatif Akhir: ${studentGrade.sumatif}
- Gaya Belajar: ${student.gayaBelajar}
- Minat: ${student.minat || '-'}
- Kondisi Sosial Emosional: ${student.kse || '-'}
- FORMAT KHUSUS: ${isFaseA ? 'FORMAT NARATIF FASE A (Fokus pada perkembangan kemampuan fondasi dan karakter)' : 'FORMAT STANDAR (Fokus pada capaian kompetensi akademik)'}

ATURAN DESKRIPSI RAPOR KURIKULUM MERDEKA (PPA 2025):
1. Gunakan bahasa yang positif, memotivasi (Joyful Learning), dan bermakna (Meaningful).
2. Sebutkan nama siswa di awal kalimat.
3. Soroti capaian TERTINGGI (Kekuatan) dan capaian TERENDAH (Area yang perlu bimbingan).
4. Berikan saran perbaikan dengan bahasa yang halus dan membangun.
5. JANGAN menyebutkan angka nilai secara langsung di dalam teks deskripsi.
6. HANYA KEMBALIKAN TEKS DESKRIPSI SAJA, tanpa basa-basi, tanpa markdown.`;

      const resultObj = await model.generateContent(prompt);
      const deskripsi = resultObj.response.text() || '';

      setGrades(prev => ({
        ...prev,
        [studentId]: { ...studentGrade, deskripsi: deskripsi.trim() }
      }));
    } catch (error: any) {
      console.error('Error generating deskripsi rapor:', error);
      if (error?.message?.includes('429') || error?.status === 429 || String(error).includes('429')) {
        alert('Kuota AI penuh, silakan tunggu 1 menit.');
      } else {
        alert('Terjadi kesalahan saat menghubungi AI.');
      }
    } finally {
      setLoadingRaporId(null);
    }
  };

  const menuCategories = [
    {
      title: 'DATA MASTER',
      items: [
        { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
        { name: 'Pengaturan Sekolah', icon: <Settings className="w-5 h-5 mr-3" /> },
        { name: 'Data Siswa', icon: <Users className="w-5 h-5 mr-3" /> },
      ]
    },
    {
      title: 'PERENCANAAN (PLAN)',
      items: [
        { name: 'Alur Tujuan Pembelajaran (ATP)', icon: <Map className="w-5 h-5 mr-3" /> },
        { name: 'Prota & Promes', icon: <Calendar className="w-5 h-5 mr-3" /> },
        { name: 'Modul Ajar', icon: <Book className="w-5 h-5 mr-3" /> },
        { name: 'LKPD & Bahan Ajar', icon: <FileText className="w-5 h-5 mr-3" /> },
      ]
    },
    {
      title: 'PELAKSANAAN (DO)',
      items: [
        { name: 'Jurnal Mengajar', icon: <BookOpen className="w-5 h-5 mr-3" /> },
      ]
    },
    {
      title: 'EVALUASI (CHECK & ACT)',
      items: [
        { name: 'KKTP (Kriteria Ketercapaian)', icon: <CheckSquare className="w-5 h-5 mr-3" /> },
        { name: 'Bank Soal & Kisi-kisi', icon: <FileQuestion className="w-5 h-5 mr-3" /> },
        { name: 'Rapor Digital', icon: <Award className="w-5 h-5 mr-3" /> },
      ]
    }
  ];

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center text-white p-6 overflow-hidden"
          >
            {/* Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-700" />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-6 rounded-3xl shadow-2xl mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <GraduationCap className="w-20 h-20 text-white" />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent">
                AI SUPER APPS
              </h1>
              <p className="text-xl md:text-2xl text-emerald-400/80 font-medium mb-12 tracking-widest uppercase">
                Administrasi Guru Modern
              </p>
              
              <div className="flex items-center gap-4 mb-16">
                <div className="h-px w-12 bg-zinc-800" />
                <div className="flex gap-4">
                  <Sparkles className="w-6 h-6 text-emerald-500 animate-bounce" />
                  <Award className="w-6 h-6 text-blue-500 animate-bounce delay-100" />
                  <BookOpen className="w-6 h-6 text-purple-500 animate-bounce delay-200" />
                </div>
                <div className="h-px w-12 bg-zinc-800" />
              </div>

              <div className="space-y-4">
                <p className="text-zinc-500 text-sm font-bold tracking-widest uppercase">Created By</p>
                <h2 className="text-2xl font-bold text-white tracking-tight">DENI RANOPTRI, M.Pd</h2>
                
                <div className="flex gap-6 justify-center mt-6">
                  <a href="https://www.instagram.com/best_deny?igsh=MTdqYTJmcWsydGUwMw%3D%3D" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-pink-500 transition-colors">
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a href="https://www.tiktok.com/@denipositif" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
                    <Share2 className="w-6 h-6" />
                  </a>
                  <a href="https://web.facebook.com/demian.renovtri.3?rdid=NebkE1tEAlxKk8ZM&share_url=https%3A%2F%2Fweb.facebook.com%2Fshare%2F1FwSzyNwVW%2F%3F_rdc%3D1%26_rdr" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-blue-500 transition-colors">
                    <Facebook className="w-6 h-6" />
                  </a>
                  <a href="https://www.youtube.com/@DeniRanoptri" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-red-500 transition-colors">
                    <Youtube className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </motion.div>
            
            <div className="absolute bottom-10 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="text-zinc-600 text-[10px] font-bold tracking-[0.3em] uppercase">Memuat Keunggulan...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    <div className="flex h-screen bg-zinc-50 font-sans text-slate-800 overflow-hidden">
      {/* Floating Global Fullscreen Button */}
      <button 
        onClick={toggleGlobalFullscreen}
        className="fixed bottom-6 right-6 z-[60] bg-zinc-900 text-white p-4 rounded-full shadow-2xl hover:bg-zinc-800 hover:scale-110 active:scale-95 transition-all group print:hidden"
        title={isGlobalFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
      >
        {isGlobalFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        <span className="absolute right-full mr-3 bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-zinc-700">
          {isGlobalFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
        </span>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 text-zinc-300 flex flex-col shadow-xl shrink-0 print:hidden transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 text-lg font-bold border-b border-zinc-800 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-emerald-400 shrink-0" />
            <span className="leading-tight">Super Apps<br/><span className="text-sm text-emerald-400/80 font-medium">Administrasi Guru</span></span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="py-2 flex-1 overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          {menuCategories.map((category) => (
            <div key={category.title} className="mb-4">
              <div className="px-6 py-2 text-xs font-bold text-zinc-500 tracking-wider">
                {category.title}
              </div>
              <ul className="menu-list">
                {category.items.map((item) => (
                  <li
                    key={item.name}
                    onClick={() => {
                      setActiveMenu(item.name);
                      if (item.name === 'Prota & Promes') setJenisPerangkat('PROTA DAN PROMES');
                      if (item.name === 'Alur Tujuan Pembelajaran (ATP)') setJenisPerangkat('ALUR TUJUAN PEMBELAJARAN');
                      if (item.name === 'Modul Ajar') setJenisPerangkat('MODUL AJAR');
                      if (item.name === 'LKPD & Bahan Ajar') setJenisPerangkat('LKPD DAN BAHAN AJAR');
                      if (item.name === 'KKTP (Kriteria Ketercapaian)') setJenisPerangkat('KKTP');
                      setIsMobileMenuOpen(false); // Close menu on mobile after selection
                    }}
                    className={`px-6 py-3 cursor-pointer transition-colors flex items-center ${
                      activeMenu === item.name
                        ? 'bg-zinc-900 text-white border-l-4 border-emerald-500'
                        : 'hover:bg-zinc-900 hover:text-white border-l-4 border-transparent'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sidebar Footer / Creator Info */}
        <div className="p-6 border-t border-zinc-900 bg-zinc-950/50">
          <p className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase mb-3">Developer</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
              DR
            </div>
            <div>
              <p className="text-xs font-bold text-white">DENI RANOPTRI</p>
              <p className="text-[10px] text-zinc-500">M.Pd</p>
            </div>
          </div>
          <div className="flex gap-3">
            <a href="https://www.instagram.com/best_deny?igsh=MTdqYTJmcWsydGUwMw%3D%3D" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-pink-500 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.tiktok.com/@denipositif" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
              <Share2 className="w-4 h-4" />
            </a>
            <a href="https://web.facebook.com/demian.renovtri.3?rdid=NebkE1tEAlxKk8ZM&share_url=https%3A%2F%2Fweb.facebook.com%2Fshare%2F1FwSzyNwVW%2F%3F_rdc%3D1%26_rdr" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-500 transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="https://www.youtube.com/@DeniRanoptri" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-red-500 transition-colors">
              <Youtube className="w-4 h-4" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 print:hidden shadow-sm z-20">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-slate-800">Super Apps Guru</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth print:p-0 print:m-0 print:overflow-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
          {activeMenu === 'Dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Greeting */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-8 text-white shadow-lg border border-zinc-800 relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-3xl font-bold mb-2">Selamat Datang, {namaGuru}! 👋</h1>
                  <p className="text-emerald-400 text-lg">Siap mengajar kelas yang luar biasa di {namaSekolah} hari ini?</p>
                </div>
                {/* Peringatan API Key */}
                {!apiKey && (
                  <div className="mt-6 bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 relative z-10">
                    <Key className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-100">API Key Gemini Belum Diisi</h4>
                      <p className="text-sm text-red-200/80 mt-1">Sistem AI belum bisa digunakan. Silakan atur di menu <strong>Pengaturan Sekolah</strong>.</p>
                      <button onClick={() => setActiveMenu('Pengaturan Sekolah')} className="mt-3 text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">Atur Sekarang</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="bg-blue-100 p-4 rounded-lg text-blue-600">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Total Siswa</p>
                    <p className="text-2xl font-bold text-slate-800">{students.length} Anak</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="bg-purple-100 p-4 rounded-lg text-purple-600">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Bank Soal Dibuat</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.bankSoal} Naskah</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="bg-green-100 p-4 rounded-lg text-green-600">
                    <Book className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Modul Ajar</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.modulAjar} Selesai</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">Aksi Cepat</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => openTambahJurnal()} className="bg-white hover:bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-100 text-left transition-all group">
                  <div className="bg-amber-100 w-12 h-12 rounded-lg flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">Isi Jurnal Harian</h4>
                  <p className="text-sm text-slate-500">Catat aktivitas ngajar & absen hari ini</p>
                </button>
                <button onClick={() => { setActiveMenu('Modul Ajar'); setJenisPerangkat('MODUL AJAR'); }} className="bg-white hover:bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-100 text-left transition-all group">
                  <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">Rancang Modul AI</h4>
                  <p className="text-sm text-slate-500">Buat RPP berdiferensiasi otomatis</p>
                </button>
                <button onClick={() => setActiveMenu('Bank Soal & Kisi-kisi')} className="bg-white hover:bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-100 text-left transition-all group">
                  <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">Buat Soal Ulangan</h4>
                  <p className="text-sm text-slate-500">Generate soal HOTS/LOTS dengan AI</p>
                </button>
              </div>

              {/* Grafik Aktivitas */}
              <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">Aktivitas Pembuatan Perangkat Ajar</h3>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Okt', 'Modul Ajar': 2, 'Bank Soal': 1 },
                        { name: 'Nov', 'Modul Ajar': 5, 'Bank Soal': 3 },
                        { name: 'Des', 'Modul Ajar': 3, 'Bank Soal': 6 },
                        { name: 'Jan', 'Modul Ajar': 6, 'Bank Soal': 4 },
                        { name: 'Feb', 'Modul Ajar': 8, 'Bank Soal': 5 },
                        { name: 'Mar', 'Modul Ajar': Math.max(stats.modulAjar, 4), 'Bank Soal': Math.max(stats.bankSoal, 2) },
                      ]}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                      <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Modul Ajar" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="Bank Soal" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mode Kelas Interaktif */}
              <div className="mt-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Gamepad2 className="w-8 h-8" /> Mode Kelas Interaktif</h3>
                  <p className="text-amber-50 max-w-xl">Luncurkan game edukasi interaktif di layar smartboard untuk membuat suasana kelas lebih hidup dan menyenangkan.</p>
                </div>
                <button onClick={() => alert('Fitur Game Interaktif akan segera hadir!')} className="bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors whitespace-nowrap">
                  Mulai Sekarang
                </button>
              </div>
            </div>
          )}

          {activeMenu === 'Data Siswa' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Data Siswa</h2>
                  <p className="text-slate-500">Kelola data siswa untuk pembelajaran berdiferensiasi.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" /> Import CSV
                  </button>
                  <button 
                    onClick={() => {
                      setStudentForm({ jk: 'L', gayaBelajar: 'Visual', kemampuan: 'Cakap' });
                      setEditingStudentId(null);
                      setShowStudentForm(true);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Tambah Siswa
                  </button>
                  <button 
                    onClick={() => clearStorageCategory('Siswa')}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-red-100"
                  >
                    <Trash2 className="w-5 h-5" /> Hapus Semua
                  </button>
                </div>
              </div>

              {/* Upload Modal */}
              {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Import Data Siswa (CSV)</h3>
                      <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 text-sm border border-blue-100">
                      <h4 className="font-bold flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> Panduan Import:</h4>
                      <ol className="list-decimal ml-5 space-y-1.5">
                        <li>Unduh template CSV terlebih dahulu.</li>
                        <li>Buka file CSV menggunakan Excel atau Google Sheets.</li>
                        <li>Isi data siswa tanpa mengubah baris pertama (header).</li>
                        <li>Pastikan penulisan <strong>Gaya Belajar</strong> (Visual/Auditori/Kinestetik) dan <strong>Kemampuan</strong> (Cakap/Dasar/Perlu Bimbingan) sesuai.</li>
                        <li>Simpan kembali dalam format <strong>.csv</strong> lalu upload di sini.</li>
                      </ol>
                    </div>

                    <div className="flex flex-col gap-4">
                      <button onClick={handleDownloadTemplate} className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-zinc-900 text-zinc-900 hover:bg-indigo-50 rounded-xl font-medium transition-colors">
                        <FileSpreadsheet className="w-5 h-5" /> Unduh Template CSV
                      </button>
                      
                      <div className="relative">
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors">
                          <Upload className="w-5 h-5" /> Pilih File CSV & Upload
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showStudentForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6 animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{editingStudentId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">NISN</label>
                      <input type="text" value={studentForm.nisn || ''} onChange={e => setStudentForm({...studentForm, nisn: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" placeholder="Contoh: 0012345678" />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Nama Lengkap</label>
                      <input type="text" value={studentForm.nama || ''} onChange={e => setStudentForm({...studentForm, nama: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" placeholder="Contoh: Budi Santoso" />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Jenis Kelamin</label>
                      <select value={studentForm.jk || 'L'} onChange={e => setStudentForm({...studentForm, jk: e.target.value as 'L'|'P'})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                        <option value="L">Laki-laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Gaya Belajar ✨</label>
                      <select value={studentForm.gayaBelajar || 'Visual'} onChange={e => setStudentForm({...studentForm, gayaBelajar: e.target.value as any})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                        <option value="Visual">Visual</option>
                        <option value="Auditori">Auditori</option>
                        <option value="Kinestetik">Kinestetik</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Tingkat Kemampuan ✨</label>
                      <select value={studentForm.kemampuan || 'Cakap'} onChange={e => setStudentForm({...studentForm, kemampuan: e.target.value as any})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                        <option value="Cakap">Cakap</option>
                        <option value="Dasar">Dasar</option>
                        <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Minat Siswa ✨</label>
                      <select value={studentForm.minat || 'Sains'} onChange={e => setStudentForm({...studentForm, minat: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                        <option value="Sains">Sains & Matematika</option>
                        <option value="Seni">Seni & Kreativitas</option>
                        <option value="Olahraga">Olahraga & Fisik</option>
                        <option value="Teknologi">Teknologi & Komputer</option>
                        <option value="Bahasa">Bahasa & Sastra</option>
                        <option value="Sosial">Ilmu Sosial & Sejarah</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Kondisi Sosial Emosional (KSE) ✨</label>
                      <select value={studentForm.kse || 'Stabil'} onChange={e => setStudentForm({...studentForm, kse: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                        <option value="Stabil">Stabil & Fokus</option>
                        <option value="Sangat Aktif">Sangat Aktif / Enerjik</option>
                        <option value="Pendiam">Pendiam / Pemalu</option>
                        <option value="Butuh Perhatian">Butuh Perhatian Khusus</option>
                        <option value="Mudah Teralihkan">Mudah Teralihkan</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowStudentForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Batal</button>
                    <button onClick={handleSaveStudent} className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium transition-colors">Simpan Data</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                        <th className="p-4 font-medium">NISN</th>
                        <th className="p-4 font-medium">Nama Lengkap</th>
                        <th className="p-4 font-medium">L/P</th>
                        <th className="p-4 font-medium">Gaya Belajar</th>
                        <th className="p-4 font-medium">Kemampuan</th>
                        <th className="p-4 font-medium">Minat</th>
                        <th className="p-4 font-medium">KSE</th>
                        <th className="p-4 font-medium text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">Belum ada data siswa. Klik "Tambah Siswa" untuk memulai.</td>
                        </tr>
                      ) : (
                        students.map(student => (
                          <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-slate-600">{student.nisn}</td>
                            <td className="p-4 font-medium text-slate-800">{student.nama}</td>
                            <td className="p-4 text-slate-600">{student.jk}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                student.gayaBelajar === 'Visual' ? 'bg-blue-100 text-blue-700' :
                                student.gayaBelajar === 'Auditori' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {student.gayaBelajar}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                student.kemampuan === 'Cakap' ? 'bg-emerald-100 text-emerald-700' :
                                student.kemampuan === 'Dasar' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {student.kemampuan}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                {student.minat || '-'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                                {student.kse || '-'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleEditStudent(student)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors mr-1"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteStudent(student.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'Jurnal Mengajar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Jurnal Mengajar (Agenda Harian)</h2>
                  <p className="text-slate-500">Catat pelaksanaan pembelajaran kelas Anda dengan cepat.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                    <Printer className="w-5 h-5" /> Cetak
                  </button>
                  <button onClick={openTambahJurnal} className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Tambah Jurnal
                  </button>
                  <button onClick={() => clearStorageCategory('Jurnal')} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium flex items-center gap-2 border border-red-100">
                    <Trash2 className="w-5 h-5" /> Hapus Semua
                  </button>
                </div>
              </div>

              {/* Form Tambah Jurnal */}
              {showJurnalForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:hidden animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-500"/> Isi Jurnal Mengajar</h3>
                    <button onClick={() => setShowJurnalForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3 text-sm text-blue-800">
                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
                    <p>Beberapa kolom telah <strong>diisi otomatis</strong> berdasarkan riwayat Modul Ajar terakhir Anda. Silakan ubah jika diperlukan.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Tanggal</label>
                      <input type="date" value={jurnalForm.tanggal || ''} onChange={e => setJurnalForm({...jurnalForm, tanggal: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Jam Ke- / Waktu</label>
                      <input type="text" value={jurnalForm.jamKe || ''} onChange={e => setJurnalForm({...jurnalForm, jamKe: e.target.value})} placeholder="Cth: 1-2 (07.30 - 09.00)" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Kelas / Fase</label>
                      <input type="text" value={jurnalForm.kelas || ''} onChange={e => setJurnalForm({...jurnalForm, kelas: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Mata Pelajaran</label>
                      <input type="text" value={jurnalForm.mapel || ''} onChange={e => setJurnalForm({...jurnalForm, mapel: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Materi Pokok</label>
                      <input type="text" value={jurnalForm.materi || ''} onChange={e => setJurnalForm({...jurnalForm, materi: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-slate-600 font-medium text-sm">Tujuan Pembelajaran</label>
                      <button 
                        type="button" 
                        onClick={() => setShowTPModal(true)}
                        className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-200 flex items-center gap-1.5 transition-colors font-medium"
                      >
                        <Database className="w-3.5 h-3.5" /> Buka Database TP
                      </button>
                    </div>
                    <textarea rows={2} value={jurnalForm.tujuanPembelajaran || ''} onChange={e => setJurnalForm({...jurnalForm, tujuanPembelajaran: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 resize-none" />
                  </div>

                  <div className="mb-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Pendekatan Pembelajaran Mendalam (Deep Learning)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block mb-2 text-emerald-700 font-medium text-xs">Mindful Learning (Fokus/Apersepsi)</label>
                        <textarea rows={2} value={jurnalForm.kegiatanMindful || ''} onChange={e => setJurnalForm({...jurnalForm, kegiatanMindful: e.target.value})} placeholder="Cth: Teknik STOP, Ice Breaking" className="w-full p-2.5 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
                      </div>
                      <div>
                        <label className="block mb-2 text-emerald-700 font-medium text-xs">Meaningful Learning (Kegiatan Inti)</label>
                        <textarea rows={2} value={jurnalForm.kegiatanMeaningful || ''} onChange={e => setJurnalForm({...jurnalForm, kegiatanMeaningful: e.target.value})} placeholder="Cth: Diskusi Kelompok, Proyek" className="w-full p-2.5 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
                      </div>
                      <div>
                        <label className="block mb-2 text-emerald-700 font-medium text-xs">Joyful Learning (Penutup/Refleksi)</label>
                        <textarea rows={2} value={jurnalForm.kegiatanJoyful || ''} onChange={e => setJurnalForm({...jurnalForm, kegiatanJoyful: e.target.value})} placeholder="Cth: Games, Refleksi Menyenangkan" className="w-full p-2.5 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2 text-slate-600 font-medium text-sm">Asesmen / Penilaian</label>
                    <input type="text" value={jurnalForm.asesmen || ''} onChange={e => setJurnalForm({...jurnalForm, asesmen: e.target.value})} placeholder="Cth: Observasi Sikap, Tes Tertulis Formatif" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2 text-slate-600 font-medium text-sm">Refleksi Guru (PPA 2025)</label>
                    <textarea rows={2} value={jurnalForm.refleksiGuru || ''} onChange={e => setJurnalForm({...jurnalForm, refleksiGuru: e.target.value})} placeholder="Cth: Apa yang berhasil? Apa yang perlu diperbaiki pada pertemuan berikutnya?" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 resize-none text-sm" />
                  </div>

                  {/* Interaktif Absensi */}
                  <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block mb-3 text-slate-800 font-bold text-sm">Absensi Siswa (Klik yang tidak hadir)</label>
                    {students.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Data siswa kosong. Tambahkan siswa di menu "Data Siswa" untuk menggunakan fitur absen otomatis.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {students.map(s => {
                          const isAbsen = jurnalForm.siswaAbsen?.includes(s.nama);
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleAbsenSiswa(s.nama)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                isAbsen ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                              }`}
                            >
                              {s.nama} {isAbsen && '(Tidak Hadir)'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <label className="block mb-2 text-slate-600 font-medium text-sm">Catatan / Refleksi Mengajar</label>
                    <textarea rows={2} value={jurnalForm.refleksi || ''} onChange={e => setJurnalForm({...jurnalForm, refleksi: e.target.value})} placeholder="Bagaimana proses pembelajaran hari ini?" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 resize-none" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowJurnalForm(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Batal</button>
                    <button onClick={simpanJurnal} className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">Simpan Ke Jurnal</button>
                  </div>
                </div>
              )}

              {/* Tabel Jurnal untuk Cetak */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:mt-0">
                <div className="hidden print:block mb-8 text-center">
                  <h1 className="text-2xl font-bold uppercase mb-2">JURNAL MENGAJAR GURU</h1>
                  <p className="text-lg font-medium">{namaSekolah}</p>
                  <p className="text-md">Tahun Ajaran {tahunAjaran} | Semester {semester}</p>
                  <hr className="mt-4 border-black border-2" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse print:text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white print:bg-slate-100 print:text-black">
                        <th className="p-3 font-medium border print:border-black w-24">Hari/Tgl</th>
                        <th className="p-3 font-medium border print:border-black w-16">Jam</th>
                        <th className="p-3 font-medium border print:border-black w-20">Kelas</th>
                        <th className="p-3 font-medium border print:border-black">Mapel, Materi & TP</th>
                        <th className="p-3 font-medium border print:border-black">Aktivitas Deep Learning & Asesmen</th>
                        <th className="p-3 font-medium border print:border-black w-32">Absensi</th>
                        <th className="p-3 font-medium border print:border-black w-40">Refleksi</th>
                        <th className="p-3 font-medium border print:hidden text-center w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jurnals.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">Belum ada catatan jurnal.</td></tr>
                      ) : (
                        jurnals.map(jurnal => (
                          <tr key={jurnal.id} className="border-b border-slate-200 hover:bg-slate-50 print:border-black">
                            <td className="p-3 border print:border-black align-top">{jurnal.tanggal}</td>
                            <td className="p-3 border print:border-black align-top text-center">{jurnal.jamKe}</td>
                            <td className="p-3 border print:border-black align-top text-center font-bold">{jurnal.kelas}</td>
                            <td className="p-3 border print:border-black align-top">
                              <div className="font-bold text-slate-800 print:text-black mb-1">{jurnal.mapel}</div>
                              <div className="text-sm font-medium text-emerald-700 print:text-black mb-1">Materi: {jurnal.materi}</div>
                              <div className="text-xs text-slate-600 print:text-black italic">TP: {jurnal.tujuanPembelajaran}</div>
                            </td>
                            <td className="p-3 border print:border-black align-top text-sm">
                              <div className="mb-1"><strong>Mindful:</strong> {jurnal.kegiatanMindful || '-'}</div>
                              <div className="mb-1"><strong>Meaningful:</strong> {jurnal.kegiatanMeaningful || '-'}</div>
                              <div className="mb-1"><strong>Joyful:</strong> {jurnal.kegiatanJoyful || '-'}</div>
                              <div className="mt-2 text-xs bg-slate-100 print:bg-transparent p-1 rounded"><strong>Asesmen:</strong> {jurnal.asesmen || '-'}</div>
                            </td>
                            <td className="p-3 border print:border-black align-top text-sm">
                              {jurnal.siswaAbsen?.length > 0 ? (
                                <ul className="list-disc ml-4 text-red-600 print:text-black">
                                  {jurnal.siswaAbsen.map((nama, idx) => <li key={idx}>{nama}</li>)}
                                </ul>
                              ) : <span className="text-emerald-600 print:text-black font-medium">Nihil (Hadir Semua)</span>}
                            </td>
                            <td className="p-3 border print:border-black align-top text-sm text-slate-700 print:text-black">{jurnal.refleksi}</td>
                            <td className="p-3 border print:hidden align-top text-center">
                              <button onClick={() => hapusJurnal(jurnal.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Tanda Tangan untuk Cetak */}
                <div className="hidden print:flex justify-between mt-16 px-12">
                  <div className="text-center">
                    <p>Mengetahui,</p>
                    <p>Kepala Sekolah</p>
                    <br/><br/><br/><br/>
                    <p className="font-bold underline">{namaKepsek}</p>
                    <p>NIP. {nipKepsek || '-'}</p>
                  </div>
                  <div className="text-center">
                    <p>................., ........................ 20...</p>
                    <p>Guru Mata Pelajaran</p>
                    <br/><br/><br/><br/>
                    <p className="font-bold underline">{namaGuru}</p>
                    <p>NIP. {nipGuru || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'Bank Soal & Kisi-kisi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 print:hidden">
                Generator Bank Soal Kurikulum Merdeka
              </h2>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8 print:hidden">
                <div className="space-y-5">
                  <div>
                    <label className="block mb-2 text-slate-600 font-medium">
                      Jenis Asesmen
                    </label>
                    <select
                      value={jenisAsesmen}
                      onChange={(e) => setJenisAsesmen(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all bg-white"
                    >
                      <option value="Sumatif Akhir Semester">Sumatif Akhir Semester</option>
                      <option value="Sumatif Tengah Semester">Sumatif Tengah Semester</option>
                      <option value="Sumatif Harian">Sumatif Harian</option>
                      <option value="Asesmen Formatif">Asesmen Formatif</option>
                      <option value="CATs (Minute Paper / Exit Ticket)">CATs (Minute Paper / Exit Ticket)</option>
                    </select>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    placeholder="Contoh: IPAS"
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Kelas
                  </label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="Contoh: 10 atau 7"
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-slate-600 font-medium">
                  Capaian Pembelajaran (CP) / Materi
                </label>
                <textarea
                  value={cp}
                  onChange={(e) => setCp(e.target.value)}
                  rows={4}
                  placeholder="Masukkan teks CP atau materi pokok di sini..."
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-y"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Jumlah PG
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={jumlahPG}
                    onChange={(e) => setJumlahPG(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Jumlah Isian
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={jumlahIsian}
                    onChange={(e) => setJumlahIsian(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Jumlah Uraian
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={jumlahUraian}
                    onChange={(e) => setJumlahUraian(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Karakter Soal
                  </label>
                  <select
                    value={karakterSoal}
                    onChange={(e) => setKarakterSoal(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all bg-white"
                  >
                    <option value="Dominan HOTS">Dominan HOTS (C4, C5, C6)</option>
                    <option value="Dasar / LOTS">Dasar / LOTS (C1, C2, C3)</option>
                    <option value="Campuran Proporsional">Campuran Proporsional</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-slate-600 font-medium">
                    Butuh Gambar?
                  </label>
                  <select
                    value={butuhGambar}
                    onChange={(e) => setButuhGambar(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all bg-white"
                  >
                    <option value="Tidak">Tidak</option>
                    <option value="Ya">Ya</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generateSoal}
                disabled={loading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyusun Soal...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Buat Soal Sekarang (Gratis)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {result && (
            <div className={`${isFullscreenBankSoal ? 'fixed inset-0 z-[100] bg-white p-4 md:p-8 overflow-y-auto' : 'bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100'} animate-in fade-in slide-in-from-bottom-4 duration-500 print:shadow-none print:border-none print:p-0 print:static`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-3 gap-4 print:hidden">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                  <FileText className="w-6 h-6 text-zinc-900" />
                  Hasil Generate Soal
                </h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsFullscreenBankSoal(!isFullscreenBankSoal)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    title={isFullscreenBankSoal ? "Keluar Layar Penuh" : "Layar Penuh"}
                  >
                    {isFullscreenBankSoal ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isFullscreenBankSoal ? "Tutup" : "Penuh"}</span>
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Cetak / PDF
                  </button>
                  <button 
                    onClick={() => handleDownloadDoc(resultRef, `Asesmen_${mapel.replace(/\s+/g, '_')}_${jenjang}.doc`)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" /> Unduh DOC
                  </button>
                </div>
              </div>
              <div className="bg-indigo-50 text-indigo-700 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2 print:hidden border border-indigo-100">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span><strong>Mode Editor Aktif:</strong> Anda bisa langsung mengklik dan mengedit teks di bawah ini sebelum dicetak atau diunduh.</span>
              </div>
              <div 
                ref={resultRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                className="prose prose-slate max-w-none w-full overflow-x-auto print:overflow-visible focus:outline-none p-4 border border-transparent focus:border-indigo-200 rounded-lg transition-colors"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.replace(/```html\n|```html|```\n|```/g, '')) }}
              />
            </div>
          )}
            </div>
          )}

          {(activeMenu === 'Prota & Promes' || activeMenu === 'Alur Tujuan Pembelajaran (ATP)' || activeMenu === 'Modul Ajar' || activeMenu === 'LKPD & Bahan Ajar' || activeMenu === 'KKTP (Kriteria Ketercapaian)') && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 print:hidden">
                Generator Perangkat Ajar AI
              </h2>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 mb-8 print:hidden">
                
                {/* Section 0: Pengaturan Dokumen & Sekolah */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-zinc-800 mb-4 border-b pb-2">Pengaturan Dokumen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Jenis Perangkat</label>
                      <select
                        value={jenisPerangkat}
                        onChange={(e) => setJenisPerangkat(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all bg-white"
                      >
                        <option value="MODUL AJAR">Modul Ajar / RPP Plus</option>
                        <option value="PROTA DAN PROMES">Prota dan Promes</option>
                        <option value="ALUR TUJUAN PEMBELAJARAN">Alur Tujuan Pembelajaran (ATP)</option>
                        <option value="MODUL KO-KURIKULER">Modul Ko-Kurikuler</option>
                        <option value="ASESMEN AWAL">Asesmen Awal (Diagnostik)</option>
                        <option value="LKPD DAN BAHAN AJAR">LKPD & Bahan Ajar</option>
                        <option value="KKTP">KKTP (Kriteria Ketercapaian)</option>
                        <option value="INSTRUMEN REFLEKSI">Instrumen Refleksi (PPA 2025)</option>
                      </select>
                    </div>
                    {!['ALUR TUJUAN PEMBELAJARAN', 'PROTA DAN PROMES', 'ASESMEN AWAL'].includes(jenisPerangkat) && (
                      <div>
                        <label className="block mb-2 text-slate-600 font-medium text-sm">Sertakan Gambar AI?</label>
                        <select
                          value={butuhGambarModul}
                          onChange={(e) => setButuhGambarModul(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all bg-white"
                        >
                          <option value="Tidak">Tidak (Hanya Teks)</option>
                          <option value="Ya">Ya (Generate Gambar AI)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 1: Informasi Umum */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-zinc-800 mb-4">1. Informasi Umum</h3>
                  
                  {!['ALUR TUJUAN PEMBELAJARAN', 'PROTA DAN PROMES'].includes(jenisPerangkat) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block mb-2 text-slate-600 font-medium text-sm">
                          {jenisPerangkat === 'MODUL KO-KURIKULER' ? 'Tema Ko-Kurikuler' : 'Topik'}
                        </label>
                        <input
                          type="text"
                          value={topik}
                          onChange={(e) => setTopik(e.target.value)}
                          placeholder={jenisPerangkat === 'MODUL KO-KURIKULER' ? "Contoh: Gaya Hidup Berkelanjutan" : "Contoh: Pemanasan Global"}
                          className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-slate-600 font-medium text-sm">
                          {jenisPerangkat === 'MODUL KO-KURIKULER' ? 'Topik Spesifik Projek' : 'Materi Pokok'}
                        </label>
                        <input
                          type="text"
                          value={materiModul}
                          onChange={(e) => setMateriModul(e.target.value)}
                          placeholder={jenisPerangkat === 'MODUL KO-KURIKULER' ? "Contoh: Sampahku Tanggung Jawabku" : "Contoh: Dampak dan Solusi"}
                          className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Mata Pelajaran</label>
                      <input
                        type="text"
                        value={mapel}
                        onChange={(e) => setMapel(e.target.value)}
                        placeholder="Contoh: Ilmu Pengetahuan Alam"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Kelas / Fase</label>
                      <input
                        type="text"
                        value={kelas}
                        onChange={(e) => setKelas(e.target.value)}
                        placeholder="Contoh: 10 atau Fase E"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {['ALUR TUJUAN PEMBELAJARAN', 'PROTA DAN PROMES'].includes(jenisPerangkat) && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-slate-600 font-medium text-sm">
                          {jenisPerangkat === 'PROTA DAN PROMES' ? 'Capaian Pembelajaran (CP) / Lingkup Materi 1 Tahun' : 'Capaian Pembelajaran (CP)'}
                        </label>
                        <button 
                          type="button" 
                          onClick={fillTemplateCPTP}
                          className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-md border border-indigo-200 flex items-center gap-1.5 transition-colors font-medium"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Gunakan Template CP & TP (Matematika Fase B)
                        </button>
                      </div>
                      <textarea
                        value={cpATP}
                        onChange={(e) => setCpATP(e.target.value)}
                        placeholder={jenisPerangkat === 'PROTA DAN PROMES' ? "Paste paragraf CP atau daftar Lingkup Materi untuk 1 tahun di sini..." : "Paste paragraf Capaian Pembelajaran (CP) dari kementerian di sini..."}
                        rows={5}
                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  )}

                  {!['ALUR TUJUAN PEMBELAJARAN', 'ASESMEN AWAL'].includes(jenisPerangkat) && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block mb-2 text-slate-600 font-medium text-sm">Jumlah Pertemuan</label>
                        <input
                          type="number"
                          min="1"
                          value={jumlahPertemuan}
                          onChange={(e) => setJumlahPertemuan(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block mb-2 text-slate-600 font-medium text-sm">Durasi (Contoh: 2 × 45 menit)</label>
                        <input
                          type="text"
                          value={alokasiWaktu}
                          onChange={(e) => setAlokasiWaktu(e.target.value)}
                          placeholder="Contoh: 2 x 45 menit"
                          className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {['PROTA DAN PROMES', 'MODUL KO-KURIKULER'].includes(jenisPerangkat) && (
                    <div className="mb-4">
                      <label className="block mb-2 text-slate-600 font-medium text-sm">Total Alokasi Waktu (Contoh: 72 JP / Semester)</label>
                      <input
                        type="text"
                        value={alokasiWaktu}
                        onChange={(e) => setAlokasiWaktu(e.target.value)}
                        placeholder="Contoh: 72 JP / Semester"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>

                {!['ALUR TUJUAN PEMBELAJARAN', 'ASESMEN AWAL'].includes(jenisPerangkat) && (
                  <>
                    <hr className="my-8 border-slate-200" />

                    {/* Section 2: Identifikasi & Desain Pembelajaran */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-zinc-800 mb-4">2. Identifikasi & Desain Pembelajaran (PPA 2025)</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block mb-2 text-slate-600 font-medium text-sm">Kemitraan (Opsional)</label>
                          <input
                            type="text"
                            value={mitraPembelajaran}
                            onChange={(e) => setMitraPembelajaran(e.target.value)}
                            placeholder="Contoh: Orang Tua, UMKM"
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block mb-2 text-slate-600 font-medium text-sm">Lingkungan (Opsional)</label>
                          <input
                            type="text"
                            value={lingkunganBelajar}
                            onChange={(e) => setLingkunganBelajar(e.target.value)}
                            placeholder="Contoh: Taman Sekolah, Lab"
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block mb-2 text-slate-600 font-medium text-sm">Teknologi (Opsional)</label>
                          <input
                            type="text"
                            value={pemanfaatanDigital}
                            onChange={(e) => setPemanfaatanDigital(e.target.value)}
                            placeholder="Contoh: AI, Canva, Quizizz"
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                          />
                        </div>
                      </div>

                      <div className="mb-6">
                        <label className="block mb-3 text-slate-600 font-medium text-sm">
                          Dimensi Profil Lulusan (PPA 2025)
                        </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        'Keimanan & Ketakwaan', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas',
                        'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'
                      ].map((profil) => (
                        <label key={profil} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dimensiProfil.includes(profil)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDimensiProfil([...dimensiProfil, profil]);
                              } else {
                                setDimensiProfil(dimensiProfil.filter(p => p !== profil));
                              }
                            }}
                            className="w-4 h-4 text-zinc-900 rounded border-slate-300 focus:ring-zinc-900"
                          />
                          <span className="text-sm text-slate-700">{profil}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-slate-600 font-medium text-sm">
                        Tujuan Pembelajaran (Kompetensi & Konten)
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setShowTPModal(true)}
                        className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-200 flex items-center gap-1.5 transition-colors font-medium"
                      >
                        <Database className="w-3.5 h-3.5" /> Buka Database TP
                      </button>
                    </div>
                    <textarea
                      value={tujuanPembelajaran}
                      onChange={(e) => setTujuanPembelajaran(e.target.value)}
                      placeholder="Gunakan Kata Kerja Operasional (KKO) yang relevan, contoh: Menganalisis dampak pemanasan global terhadap ekosistem darat dan laut."
                      rows={3}
                      className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                  
                  {students.length > 0 && (
                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-indigo-600" />
                      <div>
                        <div className="font-bold mb-1">Mode Berdiferensiasi Aktif!</div>
                        AI akan merancang perangkat ajar khusus untuk <strong>{students.length} siswa</strong> Anda berdasarkan gaya belajar dan tingkat kemampuan mereka yang ada di Data Siswa.
                      </div>
                    </div>
                  )}
                </div>
                </>
                )}

                <button
                  onClick={generateModul}
                  disabled={loadingModul}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6 text-lg shadow-md"
                >
                  {loadingModul ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Menyusun Perangkat Ajar...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-6 h-6" />
                      Buat Perangkat Ajar (Gratis)
                    </>
                  )}
                </button>
              </div>

              {/* Results Area */}
              {resultModul && (
                <div className={`${isFullscreenModulAjar ? 'fixed inset-0 z-[100] bg-white p-4 md:p-8 overflow-y-auto' : 'bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100'} animate-in fade-in slide-in-from-bottom-4 duration-500 print:shadow-none print:border-none print:p-0 print:static`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-3 gap-4 print:hidden">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                      <FileText className="w-6 h-6 text-zinc-900" />
                      Hasil Generate Perangkat Ajar
                    </h3>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsFullscreenModulAjar(!isFullscreenModulAjar)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                        title={isFullscreenModulAjar ? "Keluar Layar Penuh" : "Layar Penuh"}
                      >
                        {isFullscreenModulAjar ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isFullscreenModulAjar ? "Tutup" : "Penuh"}</span>
                      </button>
                      <button 
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Printer className="w-4 h-4" /> Cetak / PDF
                      </button>
                      <button 
                        onClick={() => handleDownloadDoc(resultModulRef, `${jenisPerangkat.replace(/\s+/g, '_')}_${mapel.replace(/\s+/g, '_')}_${jenjang}.doc`)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" /> Unduh DOC
                      </button>
                    </div>
                  </div>
                  <div className="bg-indigo-50 text-indigo-700 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2 print:hidden border border-indigo-100">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span><strong>Mode Editor Aktif:</strong> Anda bisa langsung mengklik dan mengedit teks di bawah ini sebelum dicetak atau diunduh.</span>
                  </div>
                  <div 
                    ref={resultModulRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className="prose prose-slate max-w-none w-full overflow-x-auto print:overflow-visible focus:outline-none p-4 border border-transparent focus:border-indigo-200 rounded-lg transition-colors"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resultModul.replace(/```html\n|```html|```\n|```/g, '')) }}
                  />
                </div>
              )}

              {/* Database TP (Tampil di semua menu Perangkat Ajar) */}
              {tujuanPembelajarans.length > 0 && (
                <div className="mt-8 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 print:hidden">
                  <div className="flex items-center justify-between mb-6 border-b pb-3">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Database className="w-6 h-6 text-emerald-600" />
                      Database Tujuan Pembelajaran (TP)
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                      {tujuanPembelajarans.length} TP Tersimpan
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                          <th className="p-3 font-semibold">Mata Pelajaran</th>
                          <th className="p-3 font-semibold">Kelas</th>
                          <th className="p-3 font-semibold">Tujuan Pembelajaran</th>
                          <th className="p-3 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tujuanPembelajarans.map((tp) => (
                          <tr key={tp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-sm text-slate-700">{tp.mapel}</td>
                            <td className="p-3 text-sm text-slate-700">{tp.kelas}</td>
                            <td className="p-3 text-sm text-slate-800 font-medium">{tp.teks}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setTujuanPembelajaran(tp.teks);
                                    setMapel(tp.mapel);
                                    setKelas(tp.kelas);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Gunakan TP ini"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if(window.confirm('Hapus TP ini dari database?')) {
                                      setTujuanPembelajarans(tujuanPembelajarans.filter(t => t.id !== tp.id));
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus TP"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'Rapor Digital' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Buku Nilai & Rapor Digital</h2>
                  <p className="text-slate-500 mt-1">Kelola nilai Formatif, Sumatif, dan generate deskripsi rapor otomatis dengan AI.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 bg-white p-2 px-3 rounded-lg border border-slate-200 shadow-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isFaseA} 
                        onChange={(e) => setIsFaseA(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <span className="text-sm font-medium text-slate-700">Format Naratif (Fase A)</span>
                    </label>
                  </div>
                  <button onClick={() => window.print()} className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
                    <Printer className="w-5 h-5" /> Cetak Buku Nilai
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                        <th className="p-4 font-medium border print:border-black w-12">No</th>
                        <th className="p-4 font-medium border print:border-black w-48">Nama Siswa</th>
                        <th className="p-4 font-medium border print:border-black w-32 text-center">Rata-rata Formatif</th>
                        <th className="p-4 font-medium border print:border-black w-32 text-center">Sumatif Akhir</th>
                        <th className="p-4 font-medium border print:border-black">Deskripsi Capaian Kompetensi (AI)</th>
                        <th className="p-4 font-medium border print:hidden w-32 text-center">Aksi AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">Belum ada data siswa. Tambahkan di menu Data Siswa.</td>
                        </tr>
                      ) : (
                        students.map((student, index) => {
                          const grade = grades[student.id] || { formatif: '', sumatif: '', deskripsi: '' };
                          return (
                            <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors print:border-black">
                              <td className="p-4 border print:border-black text-slate-500">{index + 1}</td>
                              <td className="p-4 border print:border-black font-medium text-slate-800">{student.nama}</td>
                              <td className="p-4 border print:border-black">
                                <input 
                                  type="number" 
                                  value={grade.formatif} 
                                  onChange={(e) => setGrades({...grades, [student.id]: {...grade, formatif: e.target.value}})}
                                  className="w-full p-2 border border-slate-200 rounded text-center outline-none focus:ring-2 focus:ring-emerald-500 print:border-none print:p-0"
                                  placeholder="0-100"
                                />
                              </td>
                              <td className="p-4 border print:border-black">
                                <input 
                                  type="number" 
                                  value={grade.sumatif} 
                                  onChange={(e) => setGrades({...grades, [student.id]: {...grade, sumatif: e.target.value}})}
                                  className="w-full p-2 border border-slate-200 rounded text-center outline-none focus:ring-2 focus:ring-emerald-500 print:border-none print:p-0"
                                  placeholder="0-100"
                                />
                              </td>
                              <td className="p-4 border print:border-black">
                                <textarea 
                                  value={grade.deskripsi} 
                                  onChange={(e) => setGrades({...grades, [student.id]: {...grade, deskripsi: e.target.value}})}
                                  className="w-full p-2 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none print:border-none print:p-0"
                                  rows={3}
                                  placeholder="Deskripsi akan di-generate oleh AI..."
                                />
                              </td>
                              <td className="p-4 border print:hidden text-center">
                                <button 
                                  onClick={() => generateDeskripsiRapor(student.id)}
                                  disabled={loadingRaporId === student.id}
                                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors disabled:opacity-50"
                                  title="Generate Deskripsi dengan AI"
                                >
                                  {loadingRaporId === student.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'Pengaturan Sekolah' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Pengaturan & Konfigurasi</h2>
                  <p className="text-slate-500 mt-1">Atur integrasi AI dan profil sekolah agar otomatis terisi saat membuat perangkat ajar.</p>
                </div>
              </div>

              {/* INTEGRASI API KEY GEMINI */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><Sparkles className="w-32 h-32" /></div>
                <div className="p-6 border-b border-slate-700/50 relative z-10">
                  <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                    <Key className="w-6 h-6 text-emerald-400" /> Integrasi AI (Gemini API Key)
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Masukkan Gemini API Key</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)} 
                        className="w-full p-3 pl-4 pr-10 border border-slate-600 bg-slate-800/50 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-500 font-mono"
                        placeholder="AIzaSyA..."
                      />
                      {apiKey && <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute right-3 top-3.5" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Key ini tersimpan aman hanya di browser komputer Anda (Local Storage) dan tidak dikirim ke server kami.</p>
                  </div>
                  <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-emerald-400"/> Panduan Mendapatkan API Key (Gratis)</h4>
                    <ol className="text-sm text-slate-300 space-y-2 list-decimal ml-4">
                      <li>Buka website <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline font-medium">Google AI Studio</a>.</li>
                      <li>Login menggunakan akun Google Anda.</li>
                      <li>Klik tombol <strong>"Create API key"</strong> biru di sebelah kiri.</li>
                      <li>Salin (Copy) teks kode yang muncul.</li>
                      <li>Tempel (Paste) kode tersebut ke kotak di sebelah kiri.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-500" /> Profil Sekolah
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nama Sekolah</label>
                    <input
                      type="text"
                      value={namaSekolah}
                      onChange={(e) => setNamaSekolah(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: SD Negeri 1 Nawin Hilir"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">NPSN</label>
                    <input
                      type="text"
                      value={npsn}
                      onChange={(e) => setNpsn(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: 12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      value={namaKepsek}
                      onChange={(e) => setNamaKepsek(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: Dr. Budi Utama, M.Pd."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={nipKepsek}
                      onChange={(e) => setNipKepsek(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: 19800101 200501 1 001"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-500" /> Profil Guru & Akademik
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nama Guru</label>
                    <input
                      type="text"
                      value={namaGuru}
                      onChange={(e) => setNamaGuru(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: Deni Ranoptri, M.Pd."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">NIP Guru</label>
                    <input
                      type="text"
                      value={nipGuru}
                      onChange={(e) => setNipGuru(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: 19900202 201502 2 002"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Jenjang Sekolah</label>
                    <select
                      value={jenjang}
                      onChange={(e) => setJenjang(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="PAUD">PAUD / TK</option>
                      <option value="SD">SD / MI</option>
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / MA / SMK</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tahun Ajaran</label>
                    <input
                      type="text"
                      value={tahunAjaran}
                      onChange={(e) => setTahunAjaran(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Contoh: 2025/2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-500" /> Manajemen Penyimpanan (Local)
                  </h3>
                  <div className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                    {(storageUsage / 1024).toFixed(2)} KB / 5.00 MB
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 font-medium">Penggunaan Memori Browser</span>
                      <span className="font-bold text-slate-800">{((storageUsage / (5 * 1024 * 1024)) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          (storageUsage / (5 * 1024 * 1024)) > 0.8 ? 'bg-red-500' : 
                          (storageUsage / (5 * 1024 * 1024)) > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (storageUsage / (5 * 1024 * 1024)) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic">Aplikasi ini menyimpan data secara lokal di browser Anda. Jika memori penuh, AI mungkin gagal menyimpan data baru.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => clearStorageCategory('TP')}
                      className="p-4 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all text-left group"
                    >
                      <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-500 mb-2" />
                      <div className="font-bold text-slate-800 text-sm">Hapus Semua TP</div>
                      <div className="text-xs text-slate-500">Kosongkan database Tujuan Pembelajaran</div>
                    </button>
                    <button 
                      onClick={() => clearStorageCategory('Siswa')}
                      className="p-4 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all text-left group"
                    >
                      <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-500 mb-2" />
                      <div className="font-bold text-slate-800 text-sm">Hapus Data Siswa</div>
                      <div className="text-xs text-slate-500">Hapus semua daftar siswa & profilnya</div>
                    </button>
                    <button 
                      onClick={() => clearStorageCategory('Jurnal')}
                      className="p-4 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all text-left group"
                    >
                      <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-500 mb-2" />
                      <div className="font-bold text-slate-800 text-sm">Hapus Jurnal</div>
                      <div className="text-xs text-slate-500">Hapus semua riwayat jurnal mengajar</div>
                    </button>
                    <button 
                      onClick={() => clearStorageCategory('Nilai Rapor')}
                      className="p-4 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all text-left group"
                    >
                      <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-500 mb-2" />
                      <div className="font-bold text-slate-800 text-sm">Hapus Nilai Rapor</div>
                      <div className="text-xs text-slate-500">Kosongkan semua nilai & deskripsi rapor</div>
                    </button>
                    <button 
                      onClick={() => clearStorageCategory('Semua')}
                      className="p-4 border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-all text-left group md:col-span-2"
                    >
                      <Trash2 className="w-5 h-5 text-red-500 mb-2" />
                      <div className="font-bold text-red-700 text-sm">RESET TOTAL APLIKASI</div>
                      <div className="text-xs text-red-600/70">Hapus SEMUA data termasuk API Key & Pengaturan Sekolah (Mulai dari nol)</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4">
                {isSaved && (
                  <div className="text-emerald-600 flex items-center gap-2 text-sm font-medium animate-in fade-in duration-300">
                    <CheckSquare className="w-5 h-5" />
                    Pengaturan berhasil disimpan!
                  </div>
                )}
                <button
                  onClick={handleSaveSettings}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-5 h-5" />
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          )}
          {/* TP Modal */}
          {showTPModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-600" />
                      Database Tujuan Pembelajaran
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Pilih TP dari koleksi Anda untuk dimasukkan ke jurnal.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <label className="cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                        <Upload className="w-4 h-4" /> Import CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                      </label>
                      <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        Format CSV harus memiliki 3 kolom: <strong>Mata Pelajaran, Kelas, Tujuan Pembelajaran</strong>. Baris pertama (header) akan diabaikan.
                      </div>
                    </div>
                    <button onClick={() => setShowTPModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="p-4 border-b border-slate-100 bg-white space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cari teks TP..." 
                      value={tpSearch}
                      onChange={(e) => setTpSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Filter Mata Pelajaran</label>
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <select 
                          value={tpFilterMapel}
                          onChange={(e) => setTpFilterMapel(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                        >
                          {['Semua', ...Array.from(new Set(tujuanPembelajarans.map(tp => tp.mapel)))].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Filter Kelas</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <select 
                          value={tpFilterKelas}
                          onChange={(e) => setTpFilterKelas(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                        >
                          {['Semua', ...Array.from(new Set(tujuanPembelajarans.map(tp => tp.kelas)))].sort().map(k => (
                            <option key={k} value={k}>{k === 'Semua' ? k : `Kelas ${k}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <button 
                    onClick={() => {
                      const filtered = tujuanPembelajarans.filter(tp => {
                        const matchesSearch = tp.teks.toLowerCase().includes(tpSearch.toLowerCase());
                        const matchesMapel = tpFilterMapel === 'Semua' || tp.mapel === tpFilterMapel;
                        const matchesKelas = tpFilterKelas === 'Semua' || tp.kelas === tpFilterKelas;
                        return matchesSearch && matchesMapel && matchesKelas;
                      });
                      if (selectedTPIds.length === filtered.length && filtered.length > 0) {
                        setSelectedTPIds([]);
                      } else {
                        setSelectedTPIds(filtered.map(tp => tp.id));
                      }
                    }}
                    className="text-xs flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold px-2 py-1 rounded hover:bg-slate-200 transition-all"
                  >
                    {(() => {
                      const filtered = tujuanPembelajarans.filter(tp => {
                        const matchesSearch = tp.teks.toLowerCase().includes(tpSearch.toLowerCase());
                        const matchesMapel = tpFilterMapel === 'Semua' || tp.mapel === tpFilterMapel;
                        const matchesKelas = tpFilterKelas === 'Semua' || tp.kelas === tpFilterKelas;
                        return matchesSearch && matchesMapel && matchesKelas;
                      });
                      return selectedTPIds.length === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      );
                    })()}
                    PILIH SEMUA HASIL FILTER
                  </button>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedTPIds.length} TP Terpilih</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  {(() => {
                    const filtered = tujuanPembelajarans.filter(tp => {
                      const matchesSearch = tp.teks.toLowerCase().includes(tpSearch.toLowerCase());
                      const matchesMapel = tpFilterMapel === 'Semua' || tp.mapel === tpFilterMapel;
                      const matchesKelas = tpFilterKelas === 'Semua' || tp.kelas === tpFilterKelas;
                      return matchesSearch && matchesMapel && matchesKelas;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-16 text-slate-400">
                          <Search className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                          <p className="font-medium">Tidak ada TP yang cocok dengan filter.</p>
                          <button 
                            onClick={() => { setTpSearch(''); setTpFilterMapel('Semua'); setTpFilterKelas('Semua'); }}
                            className="text-emerald-600 text-sm mt-2 hover:underline"
                          >
                            Reset Filter
                          </button>
                        </div>
                      );
                    }

                    return filtered.map(tp => (
                      <div 
                        key={tp.id} 
                        className={`p-4 rounded-xl border transition-all flex gap-3 group ${selectedTPIds.includes(tp.id) ? 'border-emerald-500 bg-emerald-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'}`}
                      >
                        <button 
                          onClick={() => {
                            if (selectedTPIds.includes(tp.id)) {
                              setSelectedTPIds(prev => prev.filter(id => id !== tp.id));
                            } else {
                              setSelectedTPIds(prev => [...prev, tp.id]);
                            }
                          }}
                          className="mt-1 shrink-0 text-slate-300 group-hover:text-emerald-500 transition-colors"
                        >
                          {selectedTPIds.includes(tp.id) ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 mb-2 leading-relaxed">{tp.teks}</div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{tp.mapel}</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Kelas {tp.kelas}</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Hapus Tujuan Pembelajaran ini dari database?')) {
                              handleDeleteTP(tp.id);
                            }
                          }}
                          className="shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all h-fit opacity-0 group-hover:opacity-100"
                          title="Hapus TP"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ));
                  })()}
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center">
                  <div className="text-xs text-slate-400 font-medium">
                    Total {tujuanPembelajarans.length} TP di Database
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowTPModal(false)}
                      className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleApplySelectedTPs}
                      disabled={selectedTPIds.length === 0}
                      className="px-6 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                    >
                      <CheckSquare className="w-4 h-4" />
                      GUNAKAN {selectedTPIds.length > 0 ? `${selectedTPIds.length} TP` : ''}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  </div>
  </>
);
}
