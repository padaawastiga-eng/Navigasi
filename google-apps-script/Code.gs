/**
 * APLIKASI NAVIGASI RUTE JALAN SANTAI
 * HGN TAHUN 2026 KECAMATAN PASIRWANGI
 * 
 * Google Apps Script - Code.gs (Backend)
 * Author: Panitia Hari Guru Nasional & HUT PGRI ke-81 Kecamatan Pasirwangi
 */

function doGet(e) {
  // Ambil template HTML dari file 'Index'
  var template = HtmlService.createTemplateFromFile('Index');
  
  // Evaluasi template dan set properties untuk optimasi mobile
  return template.evaluate()
      .setTitle('Navigasi Jalan Santai HGN 2026 Pasirwangi')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Menyediakan data rute presisi untuk digunakan oleh frontend
 */
function getRouteData() {
  return {
    name: "Jalan Santai HGN 2026 Kecamatan Pasirwangi",
    waypoints: [
      {
        id: "START",
        name: "START (Gedung PGRI/Alun-alun)",
        lat: -7.218420061372144,
        lng: 107.80347852494886,
        icon: "🏁",
        color: "green",
        label: "START",
        description: "Titik awal Jalan Santai. Pastikan berada dalam radius 50 meter dari titik ini untuk memulai perjalanan.",
        percentage: 0
      },
      {
        id: "POS_1",
        name: "POS 1 (Pertigaan Sukaraja)",
        lat: -7.2168328952312875,
        lng: 107.80728060724292,
        icon: "1",
        color: "blue",
        label: "POS 1",
        description: "Pos pemeriksaan pertama. Ambil kupon atau stempel di titik ini sebelum melanjutkan rute.",
        percentage: 20
      },
      {
        id: "POS_2",
        name: "POS 2 (Kampung Kancil)",
        lat: -7.212187332127545,
        lng: 107.80200207867729,
        icon: "2",
        color: "blue",
        label: "POS 2",
        description: "Pos pemeriksaan kedua. Istirahat sejenak dan minum air yang telah disediakan panitia.",
        percentage: 40
      },
      {
        id: "POS_3",
        name: "POS 3 (Pertigaan Barusari)",
        lat: -7.212982611724765,
        lng: 107.79518867755725,
        icon: "3",
        color: "blue",
        label: "POS 3",
        description: "Pos pemeriksaan ketiga. Tetap ikuti jalur berjalan santai di pinggir jalan demi keselamatan.",
        percentage: 60
      },
      {
        id: "POS_4",
        name: "POS 4 (Kampung Cigalumpit)",
        lat: -7.217256211874366,
        lng: 107.7987291553488,
        icon: "4",
        color: "blue",
        label: "POS 4",
        description: "Pos pemeriksaan terakhir. Pastikan semua kupon Anda sudah lengkap sebelum melangkah ke garis finish.",
        percentage: 80
      },
      {
        id: "FINISH",
        name: "FINISH (Gedung PGRI/Alun-alun)",
        lat: -7.218720840778179,
        lng: 107.803363456828,
        icon: "🏆",
        color: "red",
        label: "FINISH",
        description: "Garis akhir Jalan Santai! Masukkan kupon undian Anda ke dalam kotak doorprize di panggung utama.",
        percentage: 100
      }
    ]
  };
}

/**
 * Mendapatkan konfigurasi umum aplikasi
 */
function getAppConfig() {
  return {
    title: "JALAN SANTAI HGN 2026",
    subtitle: "Hari Guru Nasional & HUT Ke-81 PGRI Kecamatan Pasirwangi",
    year: "2026",
    organizer: "Panitia PGRI Cabang Pasirwangi, Garut",
    supportEmail: "pasirwangipgri@gmail.com"
  };
}
