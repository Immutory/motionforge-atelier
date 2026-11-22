import type { Word } from '../../../engine';

export const SHORT_FPS = 30;
export const SHORT_FRAMES = 780;
export const SHORT_AUDIO = 'ep01_bang_utoh_short_mix.wav';
export const SHORT_SHOCK_FRAME = 620;
export const SHORT_CTA_FRAME = 702;

export type ShortCaption = { start: number; end: number; text: string; tag: string };
export const SHORT_CAPTIONS: ShortCaption[] = [
  {
    "start": 0.08,
    "end": 1.02,
    "text": "Halo teman-teman!",
    "tag": "hook"
  },
  {
    "start": 1.08,
    "end": 1.61,
    "text": "Kenalin,",
    "tag": "hook"
  },
  {
    "start": 1.62,
    "end": 2.487,
    "text": "nama asli gue",
    "tag": "hook_name"
  },
  {
    "start": 2.487,
    "end": 3.25,
    "text": "Bolohoutoh.",
    "tag": "hook_name"
  },
  {
    "start": 3.28,
    "end": 4.217,
    "text": "Tapi panggil aja",
    "tag": "hook_name"
  },
  {
    "start": 4.217,
    "end": 4.75,
    "text": "Bang Utoh.",
    "tag": "hook_name"
  },
  {
    "start": 4.82,
    "end": 5.654,
    "text": "Gue mahasiswa",
    "tag": "identity"
  },
  {
    "start": 5.654,
    "end": 6.441,
    "text": "S1 Teknik",
    "tag": "identity"
  },
  {
    "start": 6.441,
    "end": 7.31,
    "text": "Informatika",
    "tag": "identity"
  },
  {
    "start": 7.36,
    "end": 8.36,
    "text": "hoodie himpunan,",
    "tag": "ootd_hoodie"
  },
  {
    "start": 8.38,
    "end": 9.02,
    "text": "headphone,",
    "tag": "ootd_hp"
  },
  {
    "start": 9.05,
    "end": 10.45,
    "text": "kacamata anti-radiasi,",
    "tag": "ootd_glass"
  },
  {
    "start": 10.52,
    "end": 11.282,
    "text": "Yuk, gue ajak",
    "tag": "tour_lead"
  },
  {
    "start": 11.282,
    "end": 11.88,
    "text": "tur markas",
    "tag": "tour_lead"
  },
  {
    "start": 11.88,
    "end": 12.51,
    "text": "kecil gue!",
    "tag": "tour_lead"
  },
  {
    "start": 12.58,
    "end": 13.32,
    "text": "Meja ngoding",
    "tag": "desk_mon"
  },
  {
    "start": 13.32,
    "end": 14.11,
    "text": "dual-monitor,",
    "tag": "desk_mon"
  },
  {
    "start": 14.15,
    "end": 14.795,
    "text": "dua kardus",
    "tag": "surv_mie"
  },
  {
    "start": 14.795,
    "end": 15.49,
    "text": "mie instan,",
    "tag": "surv_mie"
  },
  {
    "start": 15.58,
    "end": 16.35,
    "text": "Asyik!",
    "tag": "setup_joy"
  },
  {
    "start": 16.38,
    "end": 17.107,
    "text": "Kodingan tugas",
    "tag": "setup_smug"
  },
  {
    "start": 17.107,
    "end": 17.644,
    "text": "hari ini",
    "tag": "setup_smug"
  },
  {
    "start": 17.644,
    "end": 18.207,
    "text": "udah kelar",
    "tag": "setup_smug"
  },
  {
    "start": 18.207,
    "end": 18.85,
    "text": "100%.",
    "tag": "setup_smug"
  },
  {
    "start": 18.88,
    "end": 19.491,
    "text": "Tinggal tidur",
    "tag": "setup_smug"
  },
  {
    "start": 19.491,
    "end": 19.94,
    "text": "nyenyak!",
    "tag": "setup_smug"
  },
  {
    "start": 19.95,
    "end": 20.48,
    "text": "Eh, tunggu...",
    "tag": "shock_wait"
  },
  {
    "start": 20.65,
    "end": 21.01,
    "text": "Loh?!",
    "tag": "shock_hit"
  },
  {
    "start": 21.02,
    "end": 21.708,
    "text": "Kok tiba-tiba",
    "tag": "shock_err"
  },
  {
    "start": 21.708,
    "end": 22.286,
    "text": "muncul error",
    "tag": "shock_err"
  },
  {
    "start": 22.286,
    "end": 23.31,
    "text": "47 baris?!",
    "tag": "shock_err"
  },
  {
    "start": 23.48,
    "end": 24.201,
    "text": "Jangan lupa",
    "tag": "cta_yt"
  },
  {
    "start": 24.201,
    "end": 24.906,
    "text": "like, komen,",
    "tag": "cta_yt"
  },
  {
    "start": 24.906,
    "end": 25.35,
    "text": "dan subscribe!",
    "tag": "cta_yt"
  },
  {
    "start": 25.35,
    "end": 25.83,
    "text": "Dadah!",
    "tag": "cta_bye"
  }
];

export const SHORT_WORDS: Word[] = [
  {
    "text": "Halo",
    "start": 0.08,
    "end": 0.367
  },
  {
    "text": "teman-teman!",
    "start": 0.367,
    "end": 0.97
  },
  {
    "text": "Kenalin,",
    "start": 1.08,
    "end": 1.57
  },
  {
    "text": "nama",
    "start": 1.62,
    "end": 1.96
  },
  {
    "text": "asli",
    "start": 1.96,
    "end": 2.3
  },
  {
    "text": "gue",
    "start": 2.3,
    "end": 2.487
  },
  {
    "text": "Bolohoutoh.",
    "start": 2.487,
    "end": 3.2
  },
  {
    "text": "Tapi",
    "start": 3.28,
    "end": 3.583
  },
  {
    "text": "panggil",
    "start": 3.583,
    "end": 3.929
  },
  {
    "text": "aja",
    "start": 3.929,
    "end": 4.217
  },
  {
    "text": "Bang",
    "start": 4.217,
    "end": 4.397
  },
  {
    "text": "Utoh.",
    "start": 4.397,
    "end": 4.7
  },
  {
    "text": "Gue",
    "start": 4.82,
    "end": 4.996
  },
  {
    "text": "mahasiswa",
    "start": 4.996,
    "end": 5.654
  },
  {
    "text": "essatu",
    "start": 5.654,
    "end": 6.089
  },
  {
    "text": "Teknik",
    "start": 6.089,
    "end": 6.441
  },
  {
    "text": "Informatika",
    "start": 6.441,
    "end": 7.26
  },
  {
    "text": "hoodie",
    "start": 7.36,
    "end": 7.747
  },
  {
    "text": "himpunan,",
    "start": 7.747,
    "end": 8.31
  },
  {
    "text": "headphone,",
    "start": 8.38,
    "end": 8.97
  },
  {
    "text": "kacamata",
    "start": 9.05,
    "end": 9.644
  },
  {
    "text": "anti-radiasi,",
    "start": 9.644,
    "end": 10.4
  },
  {
    "text": "Yuk,",
    "start": 10.52,
    "end": 10.719
  },
  {
    "text": "gue",
    "start": 10.719,
    "end": 10.919
  },
  {
    "text": "ajak",
    "start": 10.919,
    "end": 11.282
  },
  {
    "text": "tur",
    "start": 11.282,
    "end": 11.481
  },
  {
    "text": "markas",
    "start": 11.481,
    "end": 11.88
  },
  {
    "text": "kecil",
    "start": 11.88,
    "end": 12.261
  },
  {
    "text": "gue!",
    "start": 12.261,
    "end": 12.46
  },
  {
    "text": "Meja",
    "start": 12.58,
    "end": 12.925
  },
  {
    "text": "ngoding",
    "start": 12.925,
    "end": 13.32
  },
  {
    "text": "dual-monitor,",
    "start": 13.32,
    "end": 14.06
  },
  {
    "text": "dua",
    "start": 14.15,
    "end": 14.365
  },
  {
    "text": "kardus",
    "start": 14.365,
    "end": 14.795
  },
  {
    "text": "mie",
    "start": 14.795,
    "end": 15.01
  },
  {
    "text": "instan,",
    "start": 15.01,
    "end": 15.44
  },
  {
    "text": "Asyik!",
    "start": 15.58,
    "end": 16.3
  },
  {
    "text": "Kodingan",
    "start": 16.38,
    "end": 16.819
  },
  {
    "text": "tugas",
    "start": 16.819,
    "end": 17.107
  },
  {
    "text": "hari",
    "start": 17.107,
    "end": 17.382
  },
  {
    "text": "ini",
    "start": 17.382,
    "end": 17.644
  },
  {
    "text": "udah",
    "start": 17.644,
    "end": 17.919
  },
  {
    "text": "kelar",
    "start": 17.919,
    "end": 18.207
  },
  {
    "text": "seratuspersen",
    "start": 18.207,
    "end": 18.8
  },
  {
    "text": "Tinggal",
    "start": 18.88,
    "end": 19.199
  },
  {
    "text": "tidur",
    "start": 19.199,
    "end": 19.491
  },
  {
    "text": "nyenyak!",
    "start": 19.491,
    "end": 19.81
  },
  {
    "text": "Eh,",
    "start": 19.95,
    "end": 20.1
  },
  {
    "text": "tunggu...",
    "start": 20.1,
    "end": 20.43
  },
  {
    "text": "Loh?!",
    "start": 20.65,
    "end": 20.82
  },
  {
    "text": "Kok",
    "start": 21.02,
    "end": 21.168
  },
  {
    "text": "tiba-tiba",
    "start": 21.168,
    "end": 21.708
  },
  {
    "text": "muncul",
    "start": 21.708,
    "end": 22.003
  },
  {
    "text": "error",
    "start": 22.003,
    "end": 22.286
  },
  {
    "text": "empatpuluhtujuh",
    "start": 22.286,
    "end": 22.977
  },
  {
    "text": "baris?!",
    "start": 22.977,
    "end": 23.26
  },
  {
    "text": "Jangan",
    "start": 23.48,
    "end": 23.857
  },
  {
    "text": "lupa",
    "start": 23.857,
    "end": 24.201
  },
  {
    "text": "like,",
    "start": 24.201,
    "end": 24.545
  },
  {
    "text": "komen,",
    "start": 24.545,
    "end": 24.906
  },
  {
    "text": "dan",
    "start": 24.906,
    "end": 25.094
  },
  {
    "text": "subscribe",
    "start": 25.094,
    "end": 25.66
  },
  {
    "text": "Dadah!",
    "start": 25.35,
    "end": 25.78
  }
];

export const SHORT_VOICE_ENV: number[] = [0, 0, 11, 99, 100, 100, 100, 100, 100, 25, 35, 75, 45, 75, 61, 72, 58, 79, 43, 89, 91, 89, 83, 74, 54, 51, 48, 39, 21, 0, 0, 0, 17, 42, 66, 97, 100, 100, 82, 95, 91, 85, 79, 43, 37, 26, 11, 1, 3, 41, 82, 100, 88, 60, 52, 71, 59, 76, 60, 25, 19, 36, 59, 77, 40, 21, 18, 36, 78, 100, 94, 88, 91, 74, 69, 29, 14, 19, 20, 67, 100, 94, 84, 94, 100, 93, 69, 67, 87, 67, 14, 9, 22, 57, 33, 26, 0, 0, 17, 42, 49, 35, 3, 1, 63, 92, 100, 59, 46, 46, 44, 8, 6, 90, 57, 50, 43, 48, 41, 45, 49, 58, 32, 56, 100, 53, 89, 100, 64, 46, 35, 87, 62, 15, 14, 93, 100, 96, 92, 37, 14, 0, 0, 0, 3, 25, 33, 59, 100, 100, 100, 100, 95, 57, 67, 77, 77, 85, 85, 56, 25, 28, 69, 58, 28, 26, 35, 71, 82, 55, 19, 46, 64, 48, 29, 23, 66, 69, 63, 21, 3, 4, 59, 60, 33, 4, 3, 64, 65, 19, 14, 21, 44, 57, 22, 5, 21, 42, 41, 26, 9, 45, 48, 30, 34, 53, 55, 39, 7, 15, 45, 34, 7, 1, 5, 34, 76, 59, 0, 0, 1, 49, 70, 49, 21, 55, 52, 43, 55, 53, 44, 37, 10, 37, 94, 100, 49, 52, 47, 72, 96, 88, 81, 75, 60, 38, 31, 25, 15, 2, 0, 20, 76, 77, 29, 5, 6, 6, 7, 17, 67, 86, 78, 67, 58, 44, 34, 25, 14, 0, 0, 8, 53, 37, 10, 48, 58, 53, 52, 63, 46, 6, 25, 63, 50, 45, 43, 32, 13, 50, 55, 25, 52, 56, 36, 19, 42, 49, 48, 42, 37, 31, 13, 18, 16, 39, 43, 40, 42, 28, 23, 14, 0, 0, 0, 0, 71, 100, 68, 63, 39, 7, 1, 0, 0, 0, 0, 0, 0, 7, 19, 31, 73, 100, 100, 100, 91, 42, 35, 78, 87, 29, 7, 2, 2, 64, 89, 44, 52, 55, 84, 76, 36, 16, 19, 64, 36, 23, 12, 40, 18, 10, 46, 78, 79, 64, 25, 46, 94, 82, 81, 66, 36, 11, 0, 0, 0, 17, 64, 84, 89, 46, 22, 77, 92, 70, 47, 64, 83, 88, 32, 59, 82, 64, 73, 44, 65, 80, 81, 79, 66, 49, 49, 51, 59, 46, 48, 46, 30, 3, 1, 19, 99, 100, 100, 91, 84, 34, 40, 29, 18, 10, 0, 0, 4, 14, 54, 82, 77, 100, 74, 66, 10, 17, 59, 63, 37, 31, 33, 72, 53, 25, 11, 25, 69, 56, 35, 42, 43, 40, 30, 18, 15, 7, 8, 66, 62, 64, 42, 23, 29, 27, 18, 1, 0, 0, 0, 10, 31, 27, 38, 38, 40, 39, 33, 31, 32, 24, 42, 56, 39, 33, 26, 22, 26, 21, 19, 17, 10, 0, 0, 22, 83, 97, 47, 56, 100, 69, 79, 100, 98, 56, 26, 63, 75, 36, 85, 95, 47, 25, 38, 63, 83, 67, 73, 61, 56, 65, 84, 62, 36, 40, 54, 53, 65, 75, 21, 78, 79, 54, 18, 7, 4, 8, 39, 38, 44, 53, 56, 76, 77, 37, 46, 26, 22, 31, 41, 66, 50, 11, 35, 38, 21, 12, 2, 44, 41, 26, 24, 20, 38, 45, 38, 23, 0, 0, 18, 48, 34, 30, 36, 35, 28, 48, 51, 46, 41, 11, 24, 63, 49, 32, 82, 91, 36, 31, 42, 70, 72, 82, 69, 76, 81, 56, 2, 0, 0, 0, 21, 78, 54, 15, 8, 11, 8, 5, 48, 96, 91, 53, 73, 53, 16, 0, 0, 0, 0, 0, 0, 25, 100, 100, 47, 36, 13, 0, 0, 0, 0, 0, 3, 38, 67, 18, 16, 100, 59, 57, 100, 79, 26, 64, 72, 36, 80, 71, 81, 92, 100, 87, 43, 27, 86, 81, 46, 22, 34, 53, 65, 41, 65, 72, 53, 35, 37, 37, 34, 88, 42, 19, 8, 39, 86, 71, 38, 15, 56, 58, 24, 42, 83, 47, 36, 76, 100, 95, 63, 58, 43, 36, 43, 70, 74, 46, 33, 30, 24, 9, 0, 0, 0, 0, 0, 0, 8, 17, 21, 76, 80, 61, 62, 59, 66, 68, 69, 15, 9, 72, 79, 58, 51, 40, 42, 60, 71, 97, 99, 70, 49, 12, 1, 3, 6, 3, 1, 1, 0, 0, 0, 7, 52, 96, 81, 60, 66, 68, 81, 78, 69, 48, 46, 41, 26, 14, 44, 94, 72, 53, 49, 20, 22, 63, 100, 100, 67, 100, 100, 100, 100, 93, 76, 35, 21, 3, 0, 0, 0, 0, 0, 0];
