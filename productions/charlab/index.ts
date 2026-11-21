import type { ProductionMeta } from '../types';

export { CharlabProduction } from './Production';
export { NusantaraProduction } from './NusantaraProduction';
export { WargaProduction } from './WargaProduction';
export { RigLabProduction } from './RigLabProduction';
export { BangUtohProduction } from './BangUtohProduction';
export { SetLabProduction } from './SetLabProduction';

export const charlabMeta: ProductionMeta = {
  id: 'charlab',
  title: 'Character Lab (Global Prototipe)',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 120,
};

export const nusantaraMeta: ProductionMeta = {
  id: 'nusantara',
  title: 'Character Lab (Ala Indonesia — Host Nusantara)',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 240,
};

export const wargaMeta: ProductionMeta = {
  id: 'warga',
  title: 'Character Lab (Ala Indonesia — NPC Warga Sehari-hari)',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 240,
};

export const riglabMeta: ProductionMeta = {
  id: 'riglab',
  title: 'Modular Rig Lab (Ekspresi, Prop, Multi-Angle, Lip-Sync)',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 120,
};

export const bangUtohMeta: ProductionMeta = {
  id: 'bangutoh',
  title: 'Pemeran Utama #1 — Bolohoutoh alias Bang Utoh (S1 Teknik Informatika)',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 240,
};

export const setLabMeta: ProductionMeta = {
  id: 'setlab',
  title: 'Set Dunia 3D Blender (Warkop · Kamar Kost · Lab Kampus S1 TI)',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 120,
};
