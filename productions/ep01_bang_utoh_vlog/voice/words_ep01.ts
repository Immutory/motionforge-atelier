import type { Word } from '../../../engine';

export const EP01_FPS = 30;
export const EP01_FRAMES = 2400;
export const EP01_AUDIO = 'ep01_bang_utoh_mix.wav';
export const EP01_SHOCK_FRAME = 1846;

export type Ep01Caption = { start: number; end: number; text: string; tag: string };
export const EP01_CAPTIONS: Ep01Caption[] = [
  {
    "start": 0.09,
    "end": 0.371,
    "text": "Halo",
    "tag": "opening"
  },
  {
    "start": 0.371,
    "end": 1.02,
    "text": "teman-teman!",
    "tag": "opening"
  },
  {
    "start": 1.29,
    "end": 2.081,
    "text": "Selamat datang",
    "tag": "opening"
  },
  {
    "start": 2.081,
    "end": 2.814,
    "text": "di episode",
    "tag": "opening"
  },
  {
    "start": 2.814,
    "end": 3.277,
    "text": "pertama",
    "tag": "opening"
  },
  {
    "start": 3.277,
    "end": 3.797,
    "text": "vlog gue.",
    "tag": "opening"
  },
  {
    "start": 4.14,
    "end": 4.67,
    "text": "Kenalin,",
    "tag": "intro_name"
  },
  {
    "start": 4.97,
    "end": 5.826,
    "text": "nama asli gue",
    "tag": "intro_name"
  },
  {
    "start": 5.826,
    "end": 6.59,
    "text": "Bolohoutoh.",
    "tag": "intro_name"
  },
  {
    "start": 7.01,
    "end": 7.934,
    "text": "Tapi panggil aja",
    "tag": "intro_name"
  },
  {
    "start": 7.934,
    "end": 8.47,
    "text": "Bang Utoh.",
    "tag": "intro_name"
  },
  {
    "start": 8.89,
    "end": 9.76,
    "text": "Gue mahasiswa",
    "tag": "identity"
  },
  {
    "start": 9.76,
    "end": 10.581,
    "text": "S1 Teknik",
    "tag": "identity"
  },
  {
    "start": 10.581,
    "end": 11.435,
    "text": "Informatika",
    "tag": "identity"
  },
  {
    "start": 11.435,
    "end": 11.987,
    "text": "yang hidup",
    "tag": "identity"
  },
  {
    "start": 11.987,
    "end": 13.041,
    "text": "merantau sebagai",
    "tag": "identity"
  },
  {
    "start": 13.041,
    "end": 13.62,
    "text": "anak kos.",
    "tag": "identity"
  },
  {
    "start": 14.1,
    "end": 14.872,
    "text": "Sehari-hari",
    "tag": "identity"
  },
  {
    "start": 14.872,
    "end": 15.55,
    "text": "ya begini,",
    "tag": "identity"
  },
  {
    "start": 15.88,
    "end": 16.87,
    "text": "hoodie himpunan,",
    "tag": "ootd_hoodie"
  },
  {
    "start": 17.1,
    "end": 17.73,
    "text": "headphone,",
    "tag": "ootd_hp"
  },
  {
    "start": 18.03,
    "end": 18.615,
    "text": "kacamata",
    "tag": "ootd_glass"
  },
  {
    "start": 18.615,
    "end": 19.42,
    "text": "anti-radiasi,",
    "tag": "ootd_glass"
  },
  {
    "start": 19.67,
    "end": 20.323,
    "text": "sama laptop",
    "tag": "ootd_laptop"
  },
  {
    "start": 20.323,
    "end": 20.851,
    "text": "yang hampir",
    "tag": "ootd_laptop"
  },
  {
    "start": 20.851,
    "end": 21.393,
    "text": "nggak pernah",
    "tag": "ootd_laptop"
  },
  {
    "start": 21.393,
    "end": 21.913,
    "text": "tidur.",
    "tag": "ootd_laptop"
  },
  {
    "start": 22.25,
    "end": 22.7,
    "text": "Yuk,",
    "tag": "tour_lead"
  },
  {
    "start": 22.71,
    "end": 23.182,
    "text": "gue ajak",
    "tag": "tour_lead"
  },
  {
    "start": 23.182,
    "end": 23.683,
    "text": "tur markas",
    "tag": "tour_lead"
  },
  {
    "start": 23.683,
    "end": 24.23,
    "text": "kecil gue!",
    "tag": "tour_lead"
  },
  {
    "start": 24.8,
    "end": 25.476,
    "text": "Di sebelah",
    "tag": "bed_tour"
  },
  {
    "start": 25.476,
    "end": 26.12,
    "text": "kiri ini",
    "tag": "bed_tour"
  },
  {
    "start": 26.12,
    "end": 26.78,
    "text": "ada kasur",
    "tag": "bed_tour"
  },
  {
    "start": 26.78,
    "end": 27.489,
    "text": "andalan plus",
    "tag": "bed_tour"
  },
  {
    "start": 27.489,
    "end": 28.016,
    "text": "jam weker",
    "tag": "bed_tour"
  },
  {
    "start": 28.016,
    "end": 28.559,
    "text": "merah yang",
    "tag": "bed_tour"
  },
  {
    "start": 28.559,
    "end": 29.086,
    "text": "tiap pagi",
    "tag": "bed_tour"
  },
  {
    "start": 29.086,
    "end": 29.927,
    "text": "selalu kalah",
    "tag": "bed_tour"
  },
  {
    "start": 29.927,
    "end": 30.603,
    "text": "lawan rasa",
    "tag": "bed_tour"
  },
  {
    "start": 30.603,
    "end": 31.343,
    "text": "ngantuk kuliah",
    "tag": "bed_tour"
  },
  {
    "start": 31.343,
    "end": 31.93,
    "text": "jam tujuh.",
    "tag": "bed_tour"
  },
  {
    "start": 32.34,
    "end": 32.86,
    "text": "Nah,",
    "tag": "desk_lead"
  },
  {
    "start": 33.01,
    "end": 33.525,
    "text": "di tengah",
    "tag": "desk_lead"
  },
  {
    "start": 33.525,
    "end": 34.346,
    "text": "ini surganya",
    "tag": "desk_lead"
  },
  {
    "start": 34.346,
    "end": 34.669,
    "text": "anak",
    "tag": "desk_lead"
  },
  {
    "start": 34.669,
    "end": 35.55,
    "text": "Informatika!",
    "tag": "desk_lead"
  },
  {
    "start": 35.88,
    "end": 36.61,
    "text": "Meja ngoding",
    "tag": "desk_mon"
  },
  {
    "start": 36.61,
    "end": 37.4,
    "text": "dual-monitor,",
    "tag": "desk_mon"
  },
  {
    "start": 37.62,
    "end": 38.412,
    "text": "PC menyala",
    "tag": "desk_pc"
  },
  {
    "start": 38.412,
    "end": 38.932,
    "text": "biru,",
    "tag": "desk_pc"
  },
  {
    "start": 38.96,
    "end": 39.831,
    "text": "papan deadline",
    "tag": "desk_wall"
  },
  {
    "start": 39.831,
    "end": 40.404,
    "text": "skripsi yang",
    "tag": "desk_wall"
  },
  {
    "start": 40.404,
    "end": 41.259,
    "text": "penuh catatan,",
    "tag": "desk_wall"
  },
  {
    "start": 41.259,
    "end": 41.817,
    "text": "plus poster",
    "tag": "desk_wall"
  },
  {
    "start": 41.817,
    "end": 42.819,
    "text": "kebanggaan S1",
    "tag": "desk_wall"
  },
  {
    "start": 42.819,
    "end": 43.658,
    "text": "Informatika",
    "tag": "desk_wall"
  },
  {
    "start": 43.658,
    "end": 44.26,
    "text": "di dinding.",
    "tag": "desk_wall"
  },
  {
    "start": 44.68,
    "end": 45.535,
    "text": "Geser ke kanan,",
    "tag": "surv_lead"
  },
  {
    "start": 45.535,
    "end": 46.491,
    "text": "ada amunisi",
    "tag": "surv_lead"
  },
  {
    "start": 46.491,
    "end": 47.362,
    "text": "bertahan hidup",
    "tag": "surv_lead"
  },
  {
    "start": 47.362,
    "end": 47.98,
    "text": "tanggal tua.",
    "tag": "surv_lead"
  },
  {
    "start": 48.38,
    "end": 48.91,
    "text": "Rak buku",
    "tag": "surv_books"
  },
  {
    "start": 48.91,
    "end": 49.67,
    "text": "algoritma,",
    "tag": "surv_books"
  },
  {
    "start": 49.84,
    "end": 50.475,
    "text": "dua kardus",
    "tag": "surv_mie"
  },
  {
    "start": 50.475,
    "end": 51.17,
    "text": "mie instan,",
    "tag": "surv_mie"
  },
  {
    "start": 51.34,
    "end": 51.891,
    "text": "galon air",
    "tag": "surv_fan"
  },
  {
    "start": 51.891,
    "end": 52.459,
    "text": "dingin, dan",
    "tag": "surv_fan"
  },
  {
    "start": 52.459,
    "end": 53.183,
    "text": "kipas angin",
    "tag": "surv_fan"
  },
  {
    "start": 53.183,
    "end": 54.079,
    "text": "setia nemenin",
    "tag": "surv_fan"
  },
  {
    "start": 54.079,
    "end": 54.69,
    "text": "begadang.",
    "tag": "surv_fan"
  },
  {
    "start": 55.24,
    "end": 56.0,
    "text": "Asyik!",
    "tag": "setup_joy"
  },
  {
    "start": 56.41,
    "end": 57.131,
    "text": "Kodingan tugas",
    "tag": "setup_smug"
  },
  {
    "start": 57.131,
    "end": 57.663,
    "text": "hari ini",
    "tag": "setup_smug"
  },
  {
    "start": 57.663,
    "end": 58.222,
    "text": "udah kelar",
    "tag": "setup_smug"
  },
  {
    "start": 58.222,
    "end": 58.87,
    "text": "100%.",
    "tag": "setup_smug"
  },
  {
    "start": 59.21,
    "end": 59.808,
    "text": "Tinggal tidur",
    "tag": "setup_smug"
  },
  {
    "start": 59.808,
    "end": 60.328,
    "text": "nyenyak!",
    "tag": "setup_smug"
  },
  {
    "start": 60.67,
    "end": 61.19,
    "text": "Eh, tunggu...",
    "tag": "shock_wait"
  },
  {
    "start": 61.58,
    "end": 62.1,
    "text": "Loh?!",
    "tag": "shock_hit"
  },
  {
    "start": 62.21,
    "end": 62.891,
    "text": "Kok tiba-tiba",
    "tag": "shock_err"
  },
  {
    "start": 62.891,
    "end": 63.465,
    "text": "muncul error",
    "tag": "shock_err"
  },
  {
    "start": 63.465,
    "end": 64.49,
    "text": "47 baris?!",
    "tag": "shock_err"
  },
  {
    "start": 64.86,
    "end": 65.93,
    "text": "Ya ampun,",
    "tag": "shock_cry"
  },
  {
    "start": 66.16,
    "end": 66.504,
    "text": "lupa",
    "tag": "shock_cry"
  },
  {
    "start": 66.504,
    "end": 67.27,
    "text": "titik koma! (;)",
    "tag": "shock_cry"
  },
  {
    "start": 67.71,
    "end": 68.23,
    "text": "Hahaha!",
    "tag": "outro_laugh"
  },
  {
    "start": 68.45,
    "end": 69.441,
    "text": "Begitulah nasib",
    "tag": "outro"
  },
  {
    "start": 69.441,
    "end": 70.46,
    "text": "mahasiswa IT.",
    "tag": "outro"
  },
  {
    "start": 70.86,
    "end": 71.579,
    "text": "Makasih udah",
    "tag": "outro"
  },
  {
    "start": 71.579,
    "end": 72.029,
    "text": "mampir ke",
    "tag": "outro"
  },
  {
    "start": 72.029,
    "end": 72.48,
    "text": "kamar kos",
    "tag": "outro"
  },
  {
    "start": 72.48,
    "end": 73.0,
    "text": "Bang Utoh.",
    "tag": "outro"
  },
  {
    "start": 73.29,
    "end": 73.852,
    "text": "Jangan lupa",
    "tag": "outro_cta"
  },
  {
    "start": 73.852,
    "end": 74.372,
    "text": "like,",
    "tag": "outro_cta"
  },
  {
    "start": 74.46,
    "end": 74.95,
    "text": "komen, dan",
    "tag": "outro_cta"
  },
  {
    "start": 74.95,
    "end": 75.456,
    "text": "subscribe",
    "tag": "outro_cta"
  },
  {
    "start": 75.456,
    "end": 75.807,
    "text": "biar gue",
    "tag": "outro_cta"
  },
  {
    "start": 75.807,
    "end": 76.62,
    "text": "makin semangat",
    "tag": "outro_cta"
  },
  {
    "start": 76.62,
    "end": 77.541,
    "text": "bikin episode",
    "tag": "outro_cta"
  },
  {
    "start": 77.541,
    "end": 78.26,
    "text": "selanjutnya.",
    "tag": "outro_cta"
  },
  {
    "start": 78.67,
    "end": 79.19,
    "text": "Dadah!",
    "tag": "outro_bye"
  }
];

export const EP01_WORDS: Word[] = [
  {
    "text": "Halo",
    "start": 0.09,
    "end": 0.371
  },
  {
    "text": "teman-teman!",
    "start": 0.371,
    "end": 0.96
  },
  {
    "text": "Selamat",
    "start": 1.29,
    "end": 1.753
  },
  {
    "text": "datang",
    "start": 1.753,
    "end": 2.081
  },
  {
    "text": "di",
    "start": 2.081,
    "end": 2.231
  },
  {
    "text": "episode",
    "start": 2.231,
    "end": 2.814
  },
  {
    "text": "pertama",
    "start": 2.814,
    "end": 3.277
  },
  {
    "text": "vlog",
    "start": 3.277,
    "end": 3.456
  },
  {
    "text": "gue.",
    "start": 3.456,
    "end": 3.62
  },
  {
    "text": "Kenalin,",
    "start": 4.14,
    "end": 4.61
  },
  {
    "text": "nama",
    "start": 4.97,
    "end": 5.306
  },
  {
    "text": "asli",
    "start": 5.306,
    "end": 5.642
  },
  {
    "text": "gue",
    "start": 5.642,
    "end": 5.826
  },
  {
    "text": "Bolohoutoh.",
    "start": 5.826,
    "end": 6.53
  },
  {
    "text": "Tapi",
    "start": 7.01,
    "end": 7.308
  },
  {
    "text": "panggil",
    "start": 7.308,
    "end": 7.65
  },
  {
    "text": "aja",
    "start": 7.65,
    "end": 7.934
  },
  {
    "text": "Bang",
    "start": 7.934,
    "end": 8.112
  },
  {
    "text": "Utoh.",
    "start": 8.112,
    "end": 8.41
  },
  {
    "text": "Gue",
    "start": 8.89,
    "end": 9.074
  },
  {
    "text": "mahasiswa",
    "start": 9.074,
    "end": 9.76
  },
  {
    "text": "essatu",
    "start": 9.76,
    "end": 10.213
  },
  {
    "text": "Teknik",
    "start": 10.213,
    "end": 10.581
  },
  {
    "text": "Informatika",
    "start": 10.581,
    "end": 11.435
  },
  {
    "text": "yang",
    "start": 11.435,
    "end": 11.635
  },
  {
    "text": "hidup",
    "start": 11.635,
    "end": 11.987
  },
  {
    "text": "merantau",
    "start": 11.987,
    "end": 12.522
  },
  {
    "text": "sebagai",
    "start": 12.522,
    "end": 13.041
  },
  {
    "text": "anak",
    "start": 13.041,
    "end": 13.376
  },
  {
    "text": "kos.",
    "start": 13.376,
    "end": 13.56
  },
  {
    "text": "Sehari-hari",
    "start": 14.1,
    "end": 14.872
  },
  {
    "text": "ya",
    "start": 14.872,
    "end": 15.027
  },
  {
    "text": "begini,",
    "start": 15.027,
    "end": 15.49
  },
  {
    "text": "hoodie",
    "start": 15.88,
    "end": 16.259
  },
  {
    "text": "himpunan,",
    "start": 16.259,
    "end": 16.81
  },
  {
    "text": "headphone,",
    "start": 17.1,
    "end": 17.67
  },
  {
    "text": "kacamata",
    "start": 18.03,
    "end": 18.615
  },
  {
    "text": "anti-radiasi,",
    "start": 18.615,
    "end": 19.36
  },
  {
    "text": "sama",
    "start": 19.67,
    "end": 19.982
  },
  {
    "text": "laptop",
    "start": 19.982,
    "end": 20.323
  },
  {
    "text": "yang",
    "start": 20.323,
    "end": 20.509
  },
  {
    "text": "hampir",
    "start": 20.509,
    "end": 20.851
  },
  {
    "text": "nggak",
    "start": 20.851,
    "end": 21.052
  },
  {
    "text": "pernah",
    "start": 21.052,
    "end": 21.393
  },
  {
    "text": "tidur.",
    "start": 21.393,
    "end": 21.72
  },
  {
    "text": "Yuk,",
    "start": 22.25,
    "end": 22.42
  },
  {
    "text": "gue",
    "start": 22.71,
    "end": 22.877
  },
  {
    "text": "ajak",
    "start": 22.877,
    "end": 23.182
  },
  {
    "text": "tur",
    "start": 23.182,
    "end": 23.349
  },
  {
    "text": "markas",
    "start": 23.349,
    "end": 23.683
  },
  {
    "text": "kecil",
    "start": 23.683,
    "end": 24.003
  },
  {
    "text": "gue!",
    "start": 24.003,
    "end": 24.17
  },
  {
    "text": "Di",
    "start": 24.8,
    "end": 24.965
  },
  {
    "text": "sebelah",
    "start": 24.965,
    "end": 25.476
  },
  {
    "text": "kiri",
    "start": 25.476,
    "end": 25.806
  },
  {
    "text": "ini",
    "start": 25.806,
    "end": 26.12
  },
  {
    "text": "ada",
    "start": 26.12,
    "end": 26.434
  },
  {
    "text": "kasur",
    "start": 26.434,
    "end": 26.78
  },
  {
    "text": "andalan",
    "start": 26.78,
    "end": 27.292
  },
  {
    "text": "plus",
    "start": 27.292,
    "end": 27.489
  },
  {
    "text": "jam",
    "start": 27.489,
    "end": 27.67
  },
  {
    "text": "weker",
    "start": 27.67,
    "end": 28.016
  },
  {
    "text": "merah",
    "start": 28.016,
    "end": 28.362
  },
  {
    "text": "yang",
    "start": 28.362,
    "end": 28.559
  },
  {
    "text": "tiap",
    "start": 28.559,
    "end": 28.756
  },
  {
    "text": "pagi",
    "start": 28.756,
    "end": 29.086
  },
  {
    "text": "selalu",
    "start": 29.086,
    "end": 29.581
  },
  {
    "text": "kalah",
    "start": 29.581,
    "end": 29.927
  },
  {
    "text": "lawan",
    "start": 29.927,
    "end": 30.273
  },
  {
    "text": "rasa",
    "start": 30.273,
    "end": 30.603
  },
  {
    "text": "ngantuk",
    "start": 30.603,
    "end": 30.981
  },
  {
    "text": "kuliah",
    "start": 30.981,
    "end": 31.343
  },
  {
    "text": "jam",
    "start": 31.343,
    "end": 31.524
  },
  {
    "text": "tujuh.",
    "start": 31.524,
    "end": 31.87
  },
  {
    "text": "Nah,",
    "start": 32.34,
    "end": 32.71
  },
  {
    "text": "di",
    "start": 33.01,
    "end": 33.171
  },
  {
    "text": "tengah",
    "start": 33.171,
    "end": 33.525
  },
  {
    "text": "ini",
    "start": 33.525,
    "end": 33.831
  },
  {
    "text": "surganya",
    "start": 33.831,
    "end": 34.346
  },
  {
    "text": "anak",
    "start": 34.346,
    "end": 34.669
  },
  {
    "text": "Informatika!",
    "start": 34.669,
    "end": 35.49
  },
  {
    "text": "Meja",
    "start": 35.88,
    "end": 36.22
  },
  {
    "text": "ngoding",
    "start": 36.22,
    "end": 36.61
  },
  {
    "text": "dual-monitor,",
    "start": 36.61,
    "end": 37.34
  },
  {
    "text": "pisi",
    "start": 37.62,
    "end": 37.921
  },
  {
    "text": "menyala",
    "start": 37.921,
    "end": 38.412
  },
  {
    "text": "biru,",
    "start": 38.412,
    "end": 38.73
  },
  {
    "text": "papan",
    "start": 38.96,
    "end": 39.305
  },
  {
    "text": "deadline",
    "start": 39.305,
    "end": 39.831
  },
  {
    "text": "skripsi",
    "start": 39.831,
    "end": 40.208
  },
  {
    "text": "yang",
    "start": 40.208,
    "end": 40.404
  },
  {
    "text": "penuh",
    "start": 40.404,
    "end": 40.75
  },
  {
    "text": "catatan,",
    "start": 40.75,
    "end": 41.259
  },
  {
    "text": "plus",
    "start": 41.259,
    "end": 41.456
  },
  {
    "text": "poster",
    "start": 41.456,
    "end": 41.817
  },
  {
    "text": "kebanggaan",
    "start": 41.817,
    "end": 42.375
  },
  {
    "text": "essatu",
    "start": 42.375,
    "end": 42.819
  },
  {
    "text": "Informatika",
    "start": 42.819,
    "end": 43.658
  },
  {
    "text": "di",
    "start": 43.658,
    "end": 43.823
  },
  {
    "text": "dinding.",
    "start": 43.823,
    "end": 44.2
  },
  {
    "text": "Geser",
    "start": 44.68,
    "end": 45.025
  },
  {
    "text": "ke",
    "start": 45.025,
    "end": 45.19
  },
  {
    "text": "kanan,",
    "start": 45.19,
    "end": 45.535
  },
  {
    "text": "ada",
    "start": 45.535,
    "end": 45.849
  },
  {
    "text": "amunisi",
    "start": 45.849,
    "end": 46.491
  },
  {
    "text": "bertahan",
    "start": 46.491,
    "end": 47.017
  },
  {
    "text": "hidup",
    "start": 47.017,
    "end": 47.362
  },
  {
    "text": "tanggal",
    "start": 47.362,
    "end": 47.739
  },
  {
    "text": "tua.",
    "start": 47.739,
    "end": 47.92
  },
  {
    "text": "Rak",
    "start": 48.38,
    "end": 48.568
  },
  {
    "text": "buku",
    "start": 48.568,
    "end": 48.91
  },
  {
    "text": "algoritma,",
    "start": 48.91,
    "end": 49.61
  },
  {
    "text": "dua",
    "start": 49.84,
    "end": 50.052
  },
  {
    "text": "kardus",
    "start": 50.052,
    "end": 50.475
  },
  {
    "text": "mie",
    "start": 50.475,
    "end": 50.687
  },
  {
    "text": "instan,",
    "start": 50.687,
    "end": 51.11
  },
  {
    "text": "galon",
    "start": 51.34,
    "end": 51.702
  },
  {
    "text": "air",
    "start": 51.702,
    "end": 51.891
  },
  {
    "text": "dingin,",
    "start": 51.891,
    "end": 52.27
  },
  {
    "text": "dan",
    "start": 52.27,
    "end": 52.459
  },
  {
    "text": "kipas",
    "start": 52.459,
    "end": 52.821
  },
  {
    "text": "angin",
    "start": 52.821,
    "end": 53.183
  },
  {
    "text": "setia",
    "start": 53.183,
    "end": 53.544
  },
  {
    "text": "nemenin",
    "start": 53.544,
    "end": 54.079
  },
  {
    "text": "begadang.",
    "start": 54.079,
    "end": 54.63
  },
  {
    "text": "Asyik!",
    "start": 55.24,
    "end": 55.94
  },
  {
    "text": "Kodingan",
    "start": 56.41,
    "end": 56.845
  },
  {
    "text": "tugas",
    "start": 56.845,
    "end": 57.131
  },
  {
    "text": "hari",
    "start": 57.131,
    "end": 57.404
  },
  {
    "text": "ini",
    "start": 57.404,
    "end": 57.663
  },
  {
    "text": "udah",
    "start": 57.663,
    "end": 57.936
  },
  {
    "text": "kelar",
    "start": 57.936,
    "end": 58.222
  },
  {
    "text": "seratuspersen",
    "start": 58.222,
    "end": 58.81
  },
  {
    "text": "Tinggal",
    "start": 59.21,
    "end": 59.522
  },
  {
    "text": "tidur",
    "start": 59.522,
    "end": 59.808
  },
  {
    "text": "nyenyak!",
    "start": 59.808,
    "end": 60.12
  },
  {
    "text": "Eh,",
    "start": 60.67,
    "end": 60.814
  },
  {
    "text": "tunggu...",
    "start": 60.814,
    "end": 61.13
  },
  {
    "text": "Loh?!",
    "start": 61.58,
    "end": 61.73
  },
  {
    "text": "Kok",
    "start": 62.21,
    "end": 62.357
  },
  {
    "text": "tiba-tiba",
    "start": 62.357,
    "end": 62.891
  },
  {
    "text": "muncul",
    "start": 62.891,
    "end": 63.185
  },
  {
    "text": "error",
    "start": 63.185,
    "end": 63.465
  },
  {
    "text": "empatpuluhtujuh",
    "start": 63.465,
    "end": 64.15
  },
  {
    "text": "baris?!",
    "start": 64.15,
    "end": 64.43
  },
  {
    "text": "Ya",
    "start": 64.86,
    "end": 65.186
  },
  {
    "text": "ampun,",
    "start": 65.186,
    "end": 65.87
  },
  {
    "text": "lupa",
    "start": 66.16,
    "end": 66.504
  },
  {
    "text": "titik",
    "start": 66.504,
    "end": 66.866
  },
  {
    "text": "koma!",
    "start": 66.866,
    "end": 67.21
  },
  {
    "text": "Hahaha!",
    "start": 67.71,
    "end": 68.17
  },
  {
    "text": "Begitulah",
    "start": 68.45,
    "end": 69.106
  },
  {
    "text": "nasib",
    "start": 69.106,
    "end": 69.441
  },
  {
    "text": "mahasiswa",
    "start": 69.441,
    "end": 70.097
  },
  {
    "text": "aiti",
    "start": 70.097,
    "end": 70.4
  },
  {
    "text": "Makasih",
    "start": 70.86,
    "end": 71.297
  },
  {
    "text": "udah",
    "start": 71.297,
    "end": 71.579
  },
  {
    "text": "mampir",
    "start": 71.579,
    "end": 71.888
  },
  {
    "text": "ke",
    "start": 71.888,
    "end": 72.029
  },
  {
    "text": "kamar",
    "start": 72.029,
    "end": 72.325
  },
  {
    "text": "kos",
    "start": 72.325,
    "end": 72.48
  },
  {
    "text": "Bang",
    "start": 72.48,
    "end": 72.648
  },
  {
    "text": "Utoh.",
    "start": 72.648,
    "end": 72.93
  },
  {
    "text": "Jangan",
    "start": 73.29,
    "end": 73.584
  },
  {
    "text": "lupa",
    "start": 73.584,
    "end": 73.852
  },
  {
    "text": "like,",
    "start": 73.852,
    "end": 74.12
  },
  {
    "text": "komen,",
    "start": 74.46,
    "end": 74.782
  },
  {
    "text": "dan",
    "start": 74.782,
    "end": 74.95
  },
  {
    "text": "subscribe",
    "start": 74.95,
    "end": 75.456
  },
  {
    "text": "biar",
    "start": 75.456,
    "end": 75.639
  },
  {
    "text": "gue",
    "start": 75.639,
    "end": 75.807
  },
  {
    "text": "makin",
    "start": 75.807,
    "end": 76.129
  },
  {
    "text": "semangat",
    "start": 76.129,
    "end": 76.62
  },
  {
    "text": "bikin",
    "start": 76.62,
    "end": 76.942
  },
  {
    "text": "episode",
    "start": 76.942,
    "end": 77.541
  },
  {
    "text": "selanjutnya.",
    "start": 77.541,
    "end": 78.2
  },
  {
    "text": "Dadah!",
    "start": 78.67,
    "end": 79.08
  }
];

/** Amplitudo RMS per-frame (0..100) dari VO asli user untuk mengunci tutup-buka mulut presisi! */
export const EP01_VOICE_ENV: number[] = [0, 0, 13, 100, 100, 100, 100, 100, 100, 27, 39, 82, 50, 82, 66, 78, 63, 86, 47, 98, 99, 97, 91, 81, 58, 55, 52, 43, 24, 4, 1, 1, 1, 0, 0, 0, 0, 1, 9, 18, 20, 79, 100, 95, 41, 81, 98, 37, 22, 100, 100, 93, 14, 6, 44, 100, 94, 72, 62, 73, 31, 83, 81, 62, 66, 87, 51, 12, 68, 57, 47, 36, 84, 82, 42, 85, 49, 11, 80, 58, 34, 18, 9, 96, 93, 85, 48, 43, 86, 90, 59, 21, 7, 9, 18, 96, 100, 100, 49, 11, 13, 24, 56, 94, 98, 82, 56, 40, 18, 13, 7, 6, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 43, 51, 92, 100, 100, 100, 96, 99, 96, 90, 74, 39, 35, 19, 13, 4, 2, 1, 1, 1, 0, 0, 0, 0, 0, 35, 81, 100, 100, 71, 49, 81, 65, 73, 79, 29, 24, 28, 56, 91, 49, 24, 19, 32, 75, 100, 100, 94, 100, 85, 77, 43, 15, 19, 22, 59, 100, 100, 96, 98, 100, 100, 76, 73, 94, 82, 18, 10, 20, 56, 46, 29, 11, 10, 4, 4, 3, 3, 1, 1, 0, 0, 0, 0, 0, 1, 34, 51, 55, 15, 2, 4, 90, 100, 95, 56, 49, 57, 25, 4, 57, 89, 58, 53, 49, 53, 44, 48, 58, 56, 36, 91, 96, 56, 100, 97, 60, 43, 55, 100, 39, 7, 73, 96, 100, 100, 74, 30, 10, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 27, 41, 74, 100, 100, 100, 100, 89, 67, 73, 89, 83, 94, 89, 51, 27, 37, 80, 53, 30, 25, 50, 79, 90, 48, 26, 58, 69, 43, 33, 25, 79, 73, 63, 9, 3, 16, 70, 64, 23, 4, 7, 79, 62, 10, 17, 28, 52, 59, 14, 5, 30, 47, 42, 23, 14, 57, 45, 34, 42, 58, 61, 34, 5, 24, 50, 31, 5, 1, 6, 54, 85, 98, 77, 68, 49, 39, 36, 27, 21, 29, 50, 68, 58, 44, 39, 17, 11, 45, 96, 65, 31, 53, 63, 21, 12, 23, 48, 32, 71, 73, 68, 48, 50, 15, 31, 61, 64, 61, 45, 38, 21, 25, 11, 20, 26, 68, 65, 54, 23, 38, 70, 53, 42, 42, 38, 44, 46, 48, 23, 1, 1, 9, 27, 24, 12, 8, 17, 18, 14, 9, 7, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 9, 14, 77, 80, 79, 84, 75, 70, 88, 79, 79, 73, 79, 67, 48, 64, 71, 67, 98, 96, 97, 98, 73, 68, 63, 45, 23, 22, 36, 26, 20, 23, 71, 61, 48, 42, 49, 41, 70, 65, 64, 31, 26, 13, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 6, 30, 77, 67, 24, 51, 59, 49, 55, 62, 49, 45, 19, 22, 89, 100, 77, 55, 52, 68, 99, 100, 90, 85, 74, 46, 36, 30, 20, 12, 3, 1, 1, 0, 0, 0, 1, 4, 68, 88, 53, 8, 5, 7, 7, 6, 61, 93, 89, 74, 65, 54, 39, 28, 21, 10, 2, 1, 1, 0, 0, 0, 0, 0, 0, 4, 57, 42, 8, 44, 68, 55, 58, 68, 53, 8, 24, 68, 55, 50, 45, 40, 14, 50, 62, 24, 58, 59, 45, 20, 46, 54, 52, 45, 40, 36, 16, 19, 18, 40, 48, 44, 46, 33, 25, 18, 3, 1, 0, 0, 0, 0, 1, 11, 10, 58, 82, 46, 49, 76, 76, 68, 68, 77, 60, 10, 2, 1, 5, 80, 55, 14, 5, 18, 54, 65, 65, 33, 31, 21, 11, 16, 30, 35, 35, 32, 28, 33, 18, 2, 1, 41, 74, 94, 45, 41, 64, 54, 69, 49, 12, 18, 62, 43, 44, 52, 42, 12, 5, 51, 49, 32, 16, 19, 27, 20, 14, 3, 2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 100, 100, 62, 66, 27, 4, 1, 0, 0, 0, 0, 0, 0, 15, 24, 47, 100, 100, 100, 100, 85, 42, 42, 100, 68, 16, 4, 2, 11, 90, 79, 63, 51, 67, 99, 58, 40, 10, 47, 64, 24, 25, 13, 46, 8, 20, 72, 82, 90, 45, 26, 79, 100, 87, 87, 58, 29, 8, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 29, 96, 59, 45, 47, 61, 40, 78, 100, 100, 89, 61, 14, 11, 47, 100, 100, 64, 100, 52, 42, 58, 73, 48, 64, 75, 82, 93, 95, 77, 48, 42, 57, 100, 46, 81, 97, 28, 5, 16, 66, 75, 43, 26, 26, 72, 45, 51, 54, 62, 65, 74, 73, 70, 67, 72, 71, 59, 65, 100, 84, 73, 37, 39, 36, 14, 1, 0, 1, 82, 92, 85, 59, 29, 31, 12, 7, 16, 58, 100, 82, 67, 76, 65, 84, 76, 23, 4, 25, 60, 46, 33, 43, 55, 59, 59, 63, 22, 53, 77, 70, 51, 33, 16, 14, 26, 37, 60, 66, 42, 32, 33, 18, 1, 1, 1, 18, 34, 36, 81, 72, 72, 13, 3, 14, 83, 98, 70, 39, 19, 17, 41, 57, 41, 28, 24, 18, 17, 39, 36, 43, 47, 51, 51, 46, 38, 38, 17, 4, 7, 33, 61, 63, 70, 60, 67, 66, 80, 46, 36, 39, 56, 76, 71, 84, 83, 66, 36, 36, 67, 75, 29, 18, 32, 62, 37, 35, 43, 53, 51, 39, 12, 4, 42, 38, 4, 3, 4, 58, 71, 48, 63, 70, 64, 56, 41, 16, 40, 65, 40, 38, 16, 10, 59, 59, 51, 18, 9, 14, 27, 21, 14, 10, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 30, 67, 92, 89, 80, 74, 57, 47, 44, 37, 26, 16, 10, 8, 5, 3, 2, 2, 1, 2, 13, 37, 70, 19, 10, 74, 49, 54, 66, 66, 65, 57, 39, 56, 64, 49, 62, 79, 100, 100, 81, 59, 53, 49, 54, 41, 20, 25, 23, 27, 85, 100, 50, 54, 28, 18, 14, 16, 97, 89, 80, 71, 82, 60, 86, 81, 92, 81, 68, 68, 69, 91, 58, 14, 47, 67, 59, 15, 53, 86, 47, 45, 72, 86, 49, 11, 48, 50, 17, 3, 6, 58, 50, 27, 17, 15, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 34, 79, 95, 94, 27, 31, 97, 97, 65, 58, 79, 92, 82, 32, 81, 83, 71, 79, 40, 81, 92, 84, 84, 72, 43, 55, 60, 60, 54, 52, 48, 20, 2, 1, 60, 100, 100, 100, 98, 74, 49, 31, 29, 20, 10, 1, 0, 0, 0, 0, 0, 0, 35, 84, 81, 70, 41, 34, 29, 64, 67, 46, 68, 66, 47, 63, 83, 81, 71, 83, 86, 46, 30, 63, 70, 72, 66, 33, 52, 76, 72, 69, 44, 33, 25, 18, 3, 0, 1, 0, 0, 0, 9, 100, 100, 55, 12, 54, 100, 87, 73, 74, 76, 91, 68, 7, 32, 71, 94, 79, 66, 30, 25, 8, 5, 23, 74, 87, 25, 6, 17, 28, 24, 40, 46, 60, 85, 66, 42, 46, 17, 3, 3, 69, 28, 36, 42, 61, 96, 100, 65, 32, 33, 65, 81, 46, 7, 45, 66, 59, 23, 2, 8, 78, 93, 71, 44, 28, 25, 21, 14, 3, 0, 0, 0, 0, 40, 100, 100, 100, 77, 29, 30, 26, 25, 13, 1, 0, 18, 89, 89, 47, 33, 21, 11, 61, 81, 31, 7, 23, 52, 34, 56, 100, 83, 63, 69, 51, 92, 96, 91, 76, 38, 22, 46, 58, 29, 28, 47, 69, 37, 4, 33, 53, 49, 45, 28, 11, 59, 43, 39, 46, 69, 65, 27, 3, 45, 64, 23, 7, 55, 81, 76, 24, 52, 81, 46, 27, 63, 74, 64, 80, 62, 47, 66, 58, 44, 49, 45, 18, 11, 8, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 14, 39, 100, 100, 59, 36, 76, 99, 54, 46, 22, 64, 36, 7, 52, 98, 89, 62, 60, 78, 94, 92, 78, 82, 77, 71, 57, 36, 17, 5, 1, 0, 17, 67, 88, 100, 46, 37, 72, 90, 97, 78, 85, 81, 52, 47, 74, 78, 56, 80, 90, 49, 26, 21, 60, 57, 28, 57, 69, 31, 19, 31, 72, 64, 61, 69, 46, 38, 48, 50, 66, 39, 20, 75, 85, 20, 9, 2, 6, 67, 66, 50, 48, 41, 54, 55, 54, 46, 14, 2, 37, 52, 44, 51, 41, 30, 28, 16, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 21, 38, 69, 100, 74, 10, 3, 12, 34, 81, 59, 23, 11, 53, 58, 66, 64, 59, 33, 18, 63, 67, 41, 57, 53, 26, 2, 1, 23, 72, 82, 96, 93, 71, 57, 49, 34, 26, 11, 2, 0, 0, 0, 0, 8, 13, 37, 83, 85, 100, 100, 80, 37, 7, 52, 66, 58, 30, 35, 58, 80, 29, 21, 7, 60, 76, 40, 42, 49, 43, 41, 22, 19, 11, 3, 51, 75, 68, 60, 28, 29, 32, 26, 11, 1, 1, 0, 0, 0, 3, 13, 29, 90, 100, 100, 95, 97, 94, 53, 40, 45, 70, 99, 90, 77, 33, 25, 30, 91, 89, 60, 68, 80, 87, 80, 54, 31, 32, 27, 24, 15, 6, 1, 0, 5, 14, 59, 64, 52, 35, 33, 12, 1, 5, 29, 47, 12, 6, 67, 84, 53, 33, 29, 32, 43, 49, 49, 44, 51, 52, 36, 27, 16, 24, 20, 41, 14, 3, 1, 2, 26, 31, 32, 62, 62, 58, 59, 47, 56, 49, 59, 57, 45, 46, 54, 44, 44, 36, 43, 21, 13, 55, 60, 54, 25, 12, 35, 32, 24, 10, 8, 5, 4, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 29, 28, 40, 41, 35, 49, 40, 36, 33, 30, 38, 54, 55, 38, 32, 26, 25, 27, 21, 19, 15, 12, 3, 1, 0, 7, 6, 5, 4, 3, 2, 2, 1, 0, 1, 60, 99, 91, 40, 100, 100, 62, 100, 100, 94, 43, 22, 92, 59, 51, 100, 82, 33, 24, 55, 78, 97, 49, 85, 63, 63, 78, 95, 42, 39, 51, 59, 59, 81, 61, 47, 96, 73, 47, 12, 5, 3, 20, 48, 41, 55, 53, 73, 85, 74, 40, 40, 29, 24, 33, 60, 69, 38, 15, 46, 32, 22, 5, 11, 61, 30, 25, 24, 22, 52, 46, 39, 13, 8, 6, 5, 2, 0, 0, 0, 0, 0, 0, 0, 37, 52, 31, 36, 39, 35, 39, 57, 54, 48, 35, 6, 45, 74, 34, 58, 100, 76, 43, 33, 57, 81, 83, 86, 75, 91, 80, 37, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 77, 71, 27, 9, 11, 9, 9, 19, 100, 95, 70, 74, 70, 26, 7, 7, 3, 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 73, 100, 98, 48, 21, 10, 7, 5, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 18, 72, 45, 11, 83, 91, 52, 100, 100, 33, 44, 92, 39, 71, 85, 76, 100, 100, 100, 64, 24, 65, 100, 65, 37, 22, 54, 67, 60, 57, 76, 74, 29, 43, 45, 25, 86, 68, 23, 13, 12, 85, 81, 65, 22, 38, 77, 30, 32, 80, 69, 44, 34, 100, 100, 85, 64, 53, 45, 33, 60, 87, 67, 36, 35, 29, 17, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 7, 25, 75, 83, 44, 22, 35, 37, 47, 66, 63, 64, 42, 12, 2, 1, 27, 41, 40, 49, 53, 53, 56, 67, 81, 74, 88, 100, 100, 95, 39, 7, 5, 2, 2, 1, 1, 1, 1, 10, 80, 82, 30, 68, 100, 83, 16, 60, 68, 23, 40, 61, 13, 7, 16, 68, 100, 100, 100, 100, 64, 74, 84, 100, 100, 93, 94, 89, 95, 82, 47, 8, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 4, 72, 100, 45, 8, 3, 9, 86, 76, 11, 3, 1, 24, 40, 41, 7, 1, 1, 0, 1, 3, 6, 8, 12, 16, 24, 33, 22, 2, 15, 24, 82, 29, 23, 37, 82, 53, 9, 6, 57, 100, 100, 100, 100, 100, 100, 89, 69, 41, 67, 88, 68, 23, 25, 53, 51, 21, 25, 71, 79, 86, 78, 37, 26, 49, 45, 27, 19, 65, 79, 45, 50, 68, 70, 19, 3, 1, 34, 60, 35, 30, 17, 11, 10, 5, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 55, 100, 83, 25, 91, 100, 83, 37, 40, 80, 100, 87, 76, 40, 100, 100, 66, 51, 71, 100, 100, 79, 50, 20, 22, 100, 93, 48, 20, 19, 68, 38, 9, 47, 78, 77, 71, 73, 99, 34, 12, 5, 54, 76, 37, 23, 11, 40, 100, 65, 53, 47, 64, 68, 10, 3, 49, 70, 60, 50, 24, 14, 6, 3, 2, 1, 0, 0, 0, 0, 0, 0, 10, 19, 23, 83, 88, 67, 67, 65, 72, 74, 75, 17, 10, 79, 86, 63, 55, 43, 46, 65, 77, 100, 100, 76, 53, 13, 1, 4, 7, 3, 1, 1, 0, 0, 0, 7, 57, 100, 89, 65, 72, 75, 89, 85, 76, 52, 50, 45, 29, 16, 48, 100, 79, 58, 53, 22, 23, 28, 75, 64, 17, 20, 30, 16, 11, 23, 67, 92, 83, 89, 65, 19, 6, 1, 1, 7, 19, 66, 97, 99, 78, 32, 48, 19, 17, 69, 98, 72, 39, 34, 69, 48, 5, 4, 52, 49, 43, 24, 30, 21, 13, 14, 12, 55, 53, 51, 34, 35, 88, 77, 12, 5, 16, 30, 71, 20, 11, 72, 49, 40, 47, 51, 20, 29, 66, 39, 26, 63, 71, 32, 46, 45, 23, 13, 57, 63, 53, 49, 33, 31, 46, 27, 3, 1, 21, 27, 24, 16, 10, 7, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 37, 100, 100, 72, 100, 100, 100, 100, 100, 92, 49, 27, 12, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
