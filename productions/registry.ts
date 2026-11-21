import type { ComponentType } from 'react';
import type { ProductionMeta } from './types';
import { StarterProduction, starterMeta } from './_starter';
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
} from './charlab';
// @forge:imports

export type RegisteredProduction = { meta: ProductionMeta; Component: ComponentType };

export const PRODUCTIONS: RegisteredProduction[] = [
  { meta: starterMeta, Component: StarterProduction },
  { meta: bangUtohMeta, Component: BangUtohProduction },
  { meta: setLabMeta, Component: SetLabProduction },
  { meta: charlabMeta, Component: CharlabProduction },
  { meta: nusantaraMeta, Component: NusantaraProduction },
  { meta: wargaMeta, Component: WargaProduction },
  { meta: riglabMeta, Component: RigLabProduction },
  // @forge:register
];
