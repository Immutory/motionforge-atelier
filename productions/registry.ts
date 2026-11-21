import type { ComponentType } from 'react';
import type { ProductionMeta } from './types';
import { StarterProduction, starterMeta } from './_starter';
// @forge:imports

export type RegisteredProduction = { meta: ProductionMeta; Component: ComponentType };

export const PRODUCTIONS: RegisteredProduction[] = [
  { meta: starterMeta, Component: StarterProduction },
  // @forge:register
];
