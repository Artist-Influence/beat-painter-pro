/**
 * Shape Component Library
 * Barrel export for all 15 shape families
 */

export { LatticeShape } from './LatticeShape';
export { OrganicShape } from './OrganicShape';
export { ParticleSphereShape } from './ParticleSphereShape';
export { ParticleRingShape } from './ParticleRingShape';
export { RibbonsShape } from './RibbonsShape';
export { HelixShape } from './HelixShape';
export { ShardsShape } from './ShardsShape';
export { VortexShape } from './VortexShape';
export { TorusKnotShape } from './TorusKnotShape';
export { MetaballShape } from './MetaballShape';
export { WaveGridShape } from './WaveGridShape';
export { RadialSpokesShape } from './RadialSpokesShape';
export { FractalTreeShape } from './FractalTreeShape';
export { CubeLatticeShape } from './CubeLatticeShape';
export { KaleidoscopeShape } from './KaleidoscopeShape';

// Re-export shared utilities
export { NEUTRAL_SOLID, NEUTRAL_WIREFRAME, NEUTRAL_EMISSIVE } from './ShapeBase';
export type { ShapeProps } from './ShapeBase';

// Shape component mapping for dynamic rendering
import type { ShapeFamily } from '@/lib/visualizerFactory/modules';
import type { FC } from 'react';
import type { ShapeProps } from './ShapeBase';

import { LatticeShape } from './LatticeShape';
import { OrganicShape } from './OrganicShape';
import { ParticleSphereShape } from './ParticleSphereShape';
import { ParticleRingShape } from './ParticleRingShape';
import { RibbonsShape } from './RibbonsShape';
import { HelixShape } from './HelixShape';
import { ShardsShape } from './ShardsShape';
import { VortexShape } from './VortexShape';
import { TorusKnotShape } from './TorusKnotShape';
import { MetaballShape } from './MetaballShape';
import { WaveGridShape } from './WaveGridShape';
import { RadialSpokesShape } from './RadialSpokesShape';
import { FractalTreeShape } from './FractalTreeShape';
import { CubeLatticeShape } from './CubeLatticeShape';
import { KaleidoscopeShape } from './KaleidoscopeShape';

export const SHAPE_COMPONENTS: Record<ShapeFamily, FC<ShapeProps>> = {
  lattice: LatticeShape,
  organic: OrganicShape,
  particle_sphere: ParticleSphereShape,
  particle_ring: ParticleRingShape,
  ribbons: RibbonsShape,
  helix: HelixShape,
  shards: ShardsShape,
  vortex: VortexShape,
  torus_knot: TorusKnotShape,
  metaball: MetaballShape,
  wave_grid: WaveGridShape,
  radial_spokes: RadialSpokesShape,
  fractal_tree: FractalTreeShape,
  cube_lattice: CubeLatticeShape,
  kaleidoscope: KaleidoscopeShape,
};
