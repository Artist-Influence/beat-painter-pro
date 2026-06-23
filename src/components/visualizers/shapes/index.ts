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
export { SphereGridShape } from './SphereGridShape';
export { DnaLadderShape } from './DnaLadderShape';
export { MobiusStripShape } from './MobiusStripShape';
export { Supershape3DShape } from './Supershape3DShape';
export { KleinBottleShape } from './KleinBottleShape';
export { SpringCoilShape } from './SpringCoilShape';
export { StarBurstShape } from './StarBurstShape';
export { CylinderStackShape } from './CylinderStackShape';
export { PyramidArrayShape } from './PyramidArrayShape';
export { RingSystemShape } from './RingSystemShape';
export { ParticleGalaxyShape } from './ParticleGalaxyShape';
export { HoneycombShape } from './HoneycombShape';
export { CrystalClusterShape } from './CrystalClusterShape';
export { Flower3DShape } from './Flower3DShape';
export { SphereSwarmShape } from './SphereSwarmShape';
export { FibonacciSphereShape } from './FibonacciSphereShape';
export { TerrainMeshShape } from './TerrainMeshShape';
export { LissajousShape } from './LissajousShape';
export { GyroidShape } from './GyroidShape';
export { TubeLatticeShape } from './TubeLatticeShape';

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
import { SphereGridShape } from './SphereGridShape';
import { DnaLadderShape } from './DnaLadderShape';
import { MobiusStripShape } from './MobiusStripShape';
import { Supershape3DShape } from './Supershape3DShape';
import { KleinBottleShape } from './KleinBottleShape';
import { SpringCoilShape } from './SpringCoilShape';
import { StarBurstShape } from './StarBurstShape';
import { CylinderStackShape } from './CylinderStackShape';
import { PyramidArrayShape } from './PyramidArrayShape';
import { RingSystemShape } from './RingSystemShape';
import { ParticleGalaxyShape } from './ParticleGalaxyShape';
import { HoneycombShape } from './HoneycombShape';
import { CrystalClusterShape } from './CrystalClusterShape';
import { Flower3DShape } from './Flower3DShape';
import { SphereSwarmShape } from './SphereSwarmShape';
import { FibonacciSphereShape } from './FibonacciSphereShape';
import { TerrainMeshShape } from './TerrainMeshShape';
import { LissajousShape } from './LissajousShape';
import { GyroidShape } from './GyroidShape';
import { TubeLatticeShape } from './TubeLatticeShape';
// Expansion pack (50+ families): grouped under ./extra
import { TetraClusterShape, OctaRingShape, IcosaOrbitShape, DodecaScatterShape } from './extra/PolyhedraShapes';
import { TorusStackShape, GyroRingsShape, CubeSpiralShape, ConeCrownShape } from './extra/RingSpiralShapes';
import { PillarArrayShape, SpikeUrchinShape, DiamondTotemShape, RingRippleShape } from './extra/BarSpikeShapes';
import { AtomShape, BlobClusterShape, StarGridShape, PrismTowerShape } from './extra/OrganicMiscShapes';
// Expansion pack II
import { TetraRingShape, PyramidRingShape, CapsuleRingShape, TorusChainShape, SpikeDiskShape } from './extra/RingFamily2';
import { ConeSpiralShape, BoxTowerShape, SphereHelixShape, HelixDoubleShape, CrystalSpireShape } from './extra/TowerFamily2';
import { DiamondGridShape, CubeCrossShape, NestedShellsShape, RingTunnelShape, FanBladesShape } from './extra/GridFamily2';
import { StarTetraShape, BloomConesShape, OrbitSwarmShape, GemClusterShape, CylinderFanShape } from './extra/ClusterFamily2';
// Expansion pack III (-> 80)
import { CubeRingShape, ConeRingShape, PillarRingShape, SphereCageShape, PlateStackShape, OrbitRingsShape, TetraTowerShape, WedgeFanShape, BurstLinesShape } from './extra/ExtraFamily3';

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
  sphere_grid: SphereGridShape,
  dna_ladder: DnaLadderShape,
  mobius_strip: MobiusStripShape,
  supershape_3d: Supershape3DShape,
  klein_bottle: KleinBottleShape,
  spring_coil: SpringCoilShape,
  star_burst: StarBurstShape,
  cylinder_stack: CylinderStackShape,
  pyramid_array: PyramidArrayShape,
  ring_system: RingSystemShape,
  particle_galaxy: ParticleGalaxyShape,
  honeycomb: HoneycombShape,
  crystal_cluster: CrystalClusterShape,
  flower_3d: Flower3DShape,
  sphere_swarm: SphereSwarmShape,
  fibonacci_sphere: FibonacciSphereShape,
  terrain_mesh: TerrainMeshShape,
  lissajous_curve: LissajousShape,
  gyroid_surface: GyroidShape,
  tube_lattice: TubeLatticeShape,
  // expansion pack
  tetra_cluster: TetraClusterShape,
  octa_ring: OctaRingShape,
  icosa_orbit: IcosaOrbitShape,
  dodeca_scatter: DodecaScatterShape,
  torus_stack: TorusStackShape,
  gyro_rings: GyroRingsShape,
  cube_spiral: CubeSpiralShape,
  cone_crown: ConeCrownShape,
  pillar_array: PillarArrayShape,
  spike_urchin: SpikeUrchinShape,
  diamond_totem: DiamondTotemShape,
  ring_ripple: RingRippleShape,
  atom: AtomShape,
  blob_cluster: BlobClusterShape,
  star_grid: StarGridShape,
  prism_tower: PrismTowerShape,
  // expansion pack II
  tetra_ring: TetraRingShape,
  pyramid_ring: PyramidRingShape,
  capsule_ring: CapsuleRingShape,
  torus_chain: TorusChainShape,
  spike_disk: SpikeDiskShape,
  cone_spiral: ConeSpiralShape,
  box_tower: BoxTowerShape,
  sphere_helix: SphereHelixShape,
  helix_double: HelixDoubleShape,
  crystal_spire: CrystalSpireShape,
  diamond_grid: DiamondGridShape,
  cube_cross: CubeCrossShape,
  nested_shells: NestedShellsShape,
  ring_tunnel: RingTunnelShape,
  fan_blades: FanBladesShape,
  star_tetra: StarTetraShape,
  bloom_cones: BloomConesShape,
  orbit_swarm: OrbitSwarmShape,
  gem_cluster: GemClusterShape,
  cylinder_fan: CylinderFanShape,
  // expansion pack III
  cube_ring: CubeRingShape,
  cone_ring: ConeRingShape,
  pillar_ring: PillarRingShape,
  sphere_cage: SphereCageShape,
  plate_stack: PlateStackShape,
  orbit_rings: OrbitRingsShape,
  tetra_tower: TetraTowerShape,
  wedge_fan: WedgeFanShape,
  burst_lines: BurstLinesShape,
};
