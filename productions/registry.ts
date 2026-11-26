import type { ComponentType } from 'react';
import type { ProductionMeta } from './types';
import { StarterProduction, starterMeta } from './_starter';
import { Ep01BangUtohVlog, ep01Meta } from './ep01_bang_utoh_vlog';
import { Ep01BangUtohShort, ep01ShortMeta } from './ep01_bang_utoh_short';
import {
  CharlabProduction,
  charlabMeta,
  NusantaraProduction,
  nusantaraMeta,
  WargaProduction,
  wargaMeta,
  RigLabProduction,
  riglabMeta,
  BangUtohProduction,
  bangUtohMeta,
  SetLabProduction,
  setLabMeta,
  KucingOyenProduction,
  kucingOyenMeta,
  YoutubeBannerProduction,
  youtubeBannerMeta,
  YoutubeProfileProduction,
  youtubeProfileMeta,
  TiktokProfileProduction,
  tiktokProfileMeta,
  ShortsThumbnailsProduction,
  shortsThumbsMeta,
  EbotProduction,
  ebotMeta,
  KampungUpgradeProduction,
  kampungUpgradeMeta,
  KampungV2Production,
  kampungV2Meta,
} from './charlab';
import { Ep02BangUtohProduction, ep02BangUtohMeta } from './ep02-bang-utoh';
import { Ep03TioBakmieProduction, ep03TioBakmieMeta } from './ep03-tio-bakmie';
import { Ep04KaryawanBakmieProduction, ep04KaryawanBakmieMeta } from './ep04-karyawan-bakmie';
import { Ep05ParkirGratisUtohProduction, ep05ParkirGratisUtohMeta } from './ep05-parkir-gratis-utoh';
// @forge:imports

export type RegisteredProduction = { meta: ProductionMeta; Component: ComponentType };

export const PRODUCTIONS: RegisteredProduction[] = [
  { meta: ep01Meta, Component: Ep01BangUtohVlog },
  { meta: ep01ShortMeta, Component: Ep01BangUtohShort },
  { meta: starterMeta, Component: StarterProduction },
  { meta: bangUtohMeta, Component: BangUtohProduction },
  { meta: ebotMeta, Component: EbotProduction },
  { meta: kucingOyenMeta, Component: KucingOyenProduction },
  { meta: youtubeBannerMeta, Component: YoutubeBannerProduction },
  { meta: youtubeProfileMeta, Component: YoutubeProfileProduction },
  { meta: tiktokProfileMeta, Component: TiktokProfileProduction },
  { meta: shortsThumbsMeta, Component: ShortsThumbnailsProduction },
  { meta: kampungUpgradeMeta, Component: KampungUpgradeProduction },
  { meta: kampungV2Meta, Component: KampungV2Production },
  { meta: setLabMeta, Component: SetLabProduction },
  { meta: charlabMeta, Component: CharlabProduction },
  { meta: nusantaraMeta, Component: NusantaraProduction },
  { meta: wargaMeta, Component: WargaProduction },
  { meta: riglabMeta, Component: RigLabProduction },
  { meta: ep02BangUtohMeta, Component: Ep02BangUtohProduction },
  { meta: ep03TioBakmieMeta, Component: Ep03TioBakmieProduction },
  { meta: ep04KaryawanBakmieMeta, Component: Ep04KaryawanBakmieProduction },
  { meta: ep05ParkirGratisUtohMeta, Component: Ep05ParkirGratisUtohProduction },
  // @forge:register
];
