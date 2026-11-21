import React from 'react';
import { Composition } from 'remotion';
import { PRODUCTIONS } from '../productions/registry';

/** Setiap produksi di productions/registry.ts otomatis jadi satu Composition. */
export const Root: React.FC = () => (
  <>
    {PRODUCTIONS.map(({ meta, Component }) => (
      <Composition
        key={meta.id}
        id={meta.id}
        component={Component}
        width={meta.width}
        height={meta.height}
        fps={meta.fps}
        durationInFrames={meta.durationInFrames}
      />
    ))}
  </>
);
