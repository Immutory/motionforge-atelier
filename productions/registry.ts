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
  KampungUpgradeProduction,
  kampungUpgradeMeta,
  KampungV2Production,
  kampungV2Meta,
} from './charlab';
// @forge:imports

export type RegisteredProduction = { meta: ProductionMeta; Component: ComponentType };

export const PRODUCTIONS: RegisteredProduction[] = [
  { meta: ep01Meta, Component: Ep01BangUtohVlog },
  { meta: ep01ShortMeta, Component: Ep01BangUtohShort },
  { meta: starterMeta, Component: StarterProduction },
  { meta: bangUtohMeta, Component: BangUtohProduction },
  { meta: kucingOyenMeta, Component: KucingOyenProduction },
  { meta: youtubeBannerMeta, Component: YoutubeBannerProduction },
  { meta: youtubeProfileMeta, Component: YoutubeProfileProduction },
  { meta: tiktokProfileMeta, Component: TiktokProfileProduction },
  { meta: kampungUpgradeMeta, Component: KampungUpgradeProduction },
  { meta: kampungV2Meta, Component: KampungV2Production },
  { meta: setLabMeta, Component: SetLabProduction },
  { meta: charlabMeta, Component: CharlabProduction },
  { meta: nusantaraMeta, Component: NusantaraProduction },
  { meta: wargaMeta, Component: WargaProduction },
  { meta: riglabMeta, Component: RigLabProduction },
  // @forge:register
];
