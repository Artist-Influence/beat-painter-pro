/**
 * Module Definitions for Procedural Visualizer Factory
 * 
 * Combinatorial space: 15 shapes × 12 layouts × 12 motions × 10 audio = 21,600 combos
 */

// =============================================================================
// SHAPE SYSTEM (15 Geometry Families)
// =============================================================================

export type ShapeFamily = 
  | 'lattice'           // Wireframe polyhedra with nodes
  | 'organic'           // Blobby deformed sphere
  | 'particle_sphere'   // Spherical particle cloud
  | 'particle_ring'     // Ring/torus particle field
  | 'ribbons'           // Flowing curved planes
  | 'helix'             // DNA-style double helix
  | 'shards'            // Crystalline fragments
  | 'vortex'            // Spiral arms
  | 'torus_knot'        // Torus knot variations
  | 'metaball'          // Blob cluster
  | 'wave_grid'         // Undulating plane grid
  | 'radial_spokes'     // Wheel/spoke pattern
  | 'fractal_tree'      // Branching structure
  | 'cube_lattice'      // 3D cube grid
  | 'kaleidoscope'      // N-fold symmetry
  | 'sphere_grid'       // Geodesic dots on sphere
  | 'dna_ladder'        // Straight twin-rail ladder
  | 'mobius_strip'      // One-sided ribbon surface
  | 'supershape_3d'     // Gielis superformula solid
  | 'klein_bottle'      // Immersed 4D surface
  | 'spring_coil'       // Thick coiled spring tube
  | 'star_burst'        // 3D spikes from center
  | 'cylinder_stack'    // Stacked discs / totem
  | 'pyramid_array'     // Grid of popping pyramids
  | 'ring_system'       // Planet with orbital rings
  | 'particle_galaxy'   // Spiral particle disk
  | 'honeycomb'         // Hex prism panel
  | 'crystal_cluster'   // Cluster of angular crystals
  | 'flower_3d'         // Layered blooming petals
  | 'sphere_swarm'      // Orbiting small spheres
  | 'fibonacci_sphere'  // Phyllotaxis point sphere
  | 'terrain_mesh'      // Noise-displaced landscape
  | 'lissajous_curve'   // 3D Lissajous tube knot
  | 'gyroid_surface'    // Gyroid iso-surface dots
  | 'tube_lattice'      // Cube-grid strut cage
  | 'tetra_cluster'     // Ball of tumbling tetrahedra
  | 'octa_ring'         // Octahedra orbiting in a band
  | 'icosa_orbit'       // Core with orbiting icosahedra
  | 'dodeca_scatter'    // Dodecahedra on an expanding shell
  | 'torus_stack'       // Tori stacked into a rippling vase
  | 'gyro_rings'        // Orthogonal gimbal rings
  | 'cube_spiral'       // Cubes along a vertical helix
  | 'cone_crown'        // Cones radiating from a hub
  | 'pillar_array'      // Equalizer grid of bars
  | 'spike_urchin'      // Dense spikes from a core
  | 'diamond_totem'     // Stacked octahedra totem
  | 'ring_ripple'       // Concentric rippling rings
  | 'atom'              // Nucleus with orbiting electrons
  | 'blob_cluster'      // Merging sphere cluster
  | 'star_grid'         // 3D lattice of pulsing stars
  | 'prism_tower'       // Twisting hexagonal-prism tower
  | 'tetra_ring'        // Tetrahedra on a ring
  | 'pyramid_ring'      // Pyramids pointing inward on a ring
  | 'capsule_ring'      // Capsules tumbling on a ring
  | 'torus_chain'       // Interlocked tori in a loop
  | 'spike_disk'        // Spikes radiating flat in a disk
  | 'cone_spiral'       // Cones climbing a spiral
  | 'box_tower'         // Twisting stacked-cube tower
  | 'sphere_helix'      // Beads along a single helix
  | 'helix_double'      // Two intertwined bead strands
  | 'crystal_spire'     // Clustered quartz bipyramids
  | 'diamond_grid'      // Octahedra rippling on a plane
  | 'cube_cross'        // Cubes in a 3D plus
  | 'nested_shells'     // Concentric wireframe shells
  | 'ring_tunnel'       // Tori receding into a tunnel
  | 'fan_blades'        // Turbine of flat blades
  | 'star_tetra'        // Two interpenetrating tetrahedra
  | 'bloom_cones'       // Cones opening like a bloom
  | 'orbit_swarm'       // Cubes whirling on tilted orbits
  | 'gem_cluster'       // Faceted icosahedra gemstone
  | 'cylinder_fan'      // Cylinders fanning from a hub
  | 'cube_ring'         // Cubes orbiting a ring
  | 'cone_ring'         // Upright cones in a circle
  | 'pillar_ring'       // Standing slabs (stonehenge)
  | 'sphere_cage'       // Spheres on a cube cage
  | 'plate_stack'       // Fanned disc stack
  | 'orbit_rings'       // Tilted flat rings
  | 'tetra_tower'       // Stacked flipped tetrahedra
  | 'wedge_fan'         // Wedges fanning radially
  | 'burst_lines';      // Thin rods radiating out

export interface ShapeConfig {
  id: ShapeFamily;
  name: string;
  elementRange: [number, number];
  polyBudget: number;         // Max polygons for this shape
  supportsWireframe: boolean;
  defaultScale: number;
}

export const SHAPE_FAMILIES: ShapeConfig[] = [
  { id: 'lattice', name: 'Lattice', elementRange: [40, 120], polyBudget: 15000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'organic', name: 'Organic Blob', elementRange: [1, 1], polyBudget: 20000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'particle_sphere', name: 'Particle Sphere', elementRange: [200, 500], polyBudget: 5000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'particle_ring', name: 'Particle Ring', elementRange: [150, 400], polyBudget: 4000, supportsWireframe: false, defaultScale: 3.0 },
  { id: 'ribbons', name: 'Ribbons', elementRange: [4, 12], polyBudget: 25000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'helix', name: 'Helix', elementRange: [30, 80], polyBudget: 18000, supportsWireframe: true, defaultScale: 2.0 },
  { id: 'shards', name: 'Shards', elementRange: [15, 40], polyBudget: 12000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'vortex', name: 'Vortex', elementRange: [3, 8], polyBudget: 20000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'torus_knot', name: 'Torus Knot', elementRange: [1, 3], polyBudget: 30000, supportsWireframe: true, defaultScale: 2.0 },
  { id: 'metaball', name: 'Metaball', elementRange: [3, 8], polyBudget: 25000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'wave_grid', name: 'Wave Grid', elementRange: [400, 1600], polyBudget: 20000, supportsWireframe: true, defaultScale: 3.5 },
  { id: 'radial_spokes', name: 'Radial Spokes', elementRange: [6, 16], polyBudget: 15000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'fractal_tree', name: 'Fractal Tree', elementRange: [30, 150], polyBudget: 18000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'cube_lattice', name: 'Cube Lattice', elementRange: [27, 125], polyBudget: 15000, supportsWireframe: true, defaultScale: 3.0 },
  { id: 'kaleidoscope', name: 'Kaleidoscope', elementRange: [4, 12], polyBudget: 25000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'sphere_grid', name: 'Sphere Grid', elementRange: [80, 400], polyBudget: 8000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'dna_ladder', name: 'DNA Ladder', elementRange: [24, 80], polyBudget: 14000, supportsWireframe: true, defaultScale: 2.0 },
  { id: 'mobius_strip', name: 'Mobius Strip', elementRange: [1, 1], polyBudget: 18000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'supershape_3d', name: 'Supershape', elementRange: [1, 1], polyBudget: 22000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'klein_bottle', name: 'Klein Bottle', elementRange: [1, 1], polyBudget: 18000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'spring_coil', name: 'Spring Coil', elementRange: [24, 72], polyBudget: 20000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'star_burst', name: 'Star Burst', elementRange: [20, 80], polyBudget: 15000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'cylinder_stack', name: 'Cylinder Stack', elementRange: [6, 24], polyBudget: 14000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'pyramid_array', name: 'Pyramid Array', elementRange: [16, 100], polyBudget: 16000, supportsWireframe: true, defaultScale: 3.0 },
  { id: 'ring_system', name: 'Ring System', elementRange: [9, 21], polyBudget: 16000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'particle_galaxy', name: 'Particle Galaxy', elementRange: [100, 400], polyBudget: 5000, supportsWireframe: false, defaultScale: 3.0 },
  { id: 'honeycomb', name: 'Honeycomb', elementRange: [20, 100], polyBudget: 16000, supportsWireframe: true, defaultScale: 3.0 },
  { id: 'crystal_cluster', name: 'Crystal Cluster', elementRange: [12, 40], polyBudget: 14000, supportsWireframe: true, defaultScale: 2.5 },
  { id: 'flower_3d', name: 'Flower 3D', elementRange: [18, 36], polyBudget: 16000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'sphere_swarm', name: 'Sphere Swarm', elementRange: [40, 160], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'fibonacci_sphere', name: 'Fibonacci Sphere', elementRange: [100, 400], polyBudget: 6000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'terrain_mesh', name: 'Terrain Mesh', elementRange: [144, 1024], polyBudget: 20000, supportsWireframe: true, defaultScale: 3.5 },
  { id: 'lissajous_curve', name: 'Lissajous Curve', elementRange: [1, 5], polyBudget: 22000, supportsWireframe: false, defaultScale: 2.5 },
  { id: 'gyroid_surface', name: 'Gyroid Surface', elementRange: [40, 90], polyBudget: 18000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'tube_lattice', name: 'Tube Lattice', elementRange: [27, 64], polyBudget: 18000, supportsWireframe: true, defaultScale: 2.5 },
  // expansion pack - all internally bounded to ~1.2r, so a modest defaultScale frames them
  { id: 'tetra_cluster', name: 'Tetra Cluster', elementRange: [14, 30], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'octa_ring', name: 'Octa Ring', elementRange: [8, 18], polyBudget: 10000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'icosa_orbit', name: 'Icosa Orbit', elementRange: [6, 14], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'dodeca_scatter', name: 'Dodeca Scatter', elementRange: [10, 22], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'torus_stack', name: 'Torus Stack', elementRange: [6, 11], polyBudget: 16000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'gyro_rings', name: 'Gyro Rings', elementRange: [1, 3], polyBudget: 16000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'cube_spiral', name: 'Cube Spiral', elementRange: [18, 40], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'cone_crown', name: 'Cone Crown', elementRange: [10, 22], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'pillar_array', name: 'Pillar Array', elementRange: [16, 64], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'spike_urchin', name: 'Spike Urchin', elementRange: [40, 120], polyBudget: 16000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'diamond_totem', name: 'Diamond Totem', elementRange: [5, 9], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'ring_ripple', name: 'Ring Ripple', elementRange: [5, 9], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'atom', name: 'Atom', elementRange: [1, 3], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'blob_cluster', name: 'Blob Cluster', elementRange: [7, 16], polyBudget: 16000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'star_grid', name: 'Star Grid', elementRange: [27, 64], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'prism_tower', name: 'Prism Tower', elementRange: [6, 12], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  // expansion pack II - all internally bounded to ~1.2r
  { id: 'tetra_ring', name: 'Tetra Ring', elementRange: [8, 16], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'pyramid_ring', name: 'Pyramid Ring', elementRange: [8, 16], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'capsule_ring', name: 'Capsule Ring', elementRange: [7, 14], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'torus_chain', name: 'Torus Chain', elementRange: [8, 14], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'spike_disk', name: 'Spike Disk', elementRange: [14, 30], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'cone_spiral', name: 'Cone Spiral', elementRange: [14, 30], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'box_tower', name: 'Box Tower', elementRange: [7, 13], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'sphere_helix', name: 'Sphere Helix', elementRange: [16, 34], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'helix_double', name: 'Double Helix', elementRange: [20, 40], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'crystal_spire', name: 'Crystal Spire', elementRange: [5, 9], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'diamond_grid', name: 'Diamond Grid', elementRange: [9, 36], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'cube_cross', name: 'Cube Cross', elementRange: [13, 13], polyBudget: 10000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'nested_shells', name: 'Nested Shells', elementRange: [18, 30], polyBudget: 16000, supportsWireframe: true, defaultScale: 2.0 },
  { id: 'ring_tunnel', name: 'Ring Tunnel', elementRange: [8, 16], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'fan_blades', name: 'Fan Blades', elementRange: [6, 14], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'star_tetra', name: 'Star Tetra', elementRange: [2, 2], polyBudget: 10000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'bloom_cones', name: 'Bloom Cones', elementRange: [8, 18], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'orbit_swarm', name: 'Orbit Swarm', elementRange: [24, 80], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'gem_cluster', name: 'Gem Cluster', elementRange: [8, 18], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'cylinder_fan', name: 'Cylinder Fan', elementRange: [6, 14], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  // expansion pack III - all internally bounded to ~1.2r
  { id: 'cube_ring', name: 'Cube Ring', elementRange: [8, 16], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'cone_ring', name: 'Cone Ring', elementRange: [8, 16], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'pillar_ring', name: 'Pillar Ring', elementRange: [7, 14], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'sphere_cage', name: 'Sphere Cage', elementRange: [20, 20], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'plate_stack', name: 'Plate Stack', elementRange: [7, 13], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'orbit_rings', name: 'Orbit Rings', elementRange: [9, 18], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'tetra_tower', name: 'Tetra Tower', elementRange: [6, 11], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'wedge_fan', name: 'Wedge Fan', elementRange: [6, 14], polyBudget: 12000, supportsWireframe: false, defaultScale: 2.0 },
  { id: 'burst_lines', name: 'Burst Lines', elementRange: [30, 90], polyBudget: 14000, supportsWireframe: false, defaultScale: 2.0 },
];

// =============================================================================
// LAYOUT SYSTEM (12 Formations)
// =============================================================================

export type LayoutFormation = 
  | 'centered_single'      // One element at origin
  | 'spherical_shell'      // Elements on sphere surface
  | 'double_ring'          // Concentric horizontal rings
  | 'vertical_stack'       // Stacked layers along Y
  | 'orbital_planes'       // Multiple orbital rings at angles
  | 'fibonacci_spiral'     // Golden ratio spiral placement
  | 'cube_corners'         // 8 corners of cube
  | 'icosahedron_vertices' // 12 vertices of icosahedron
  | 'random_cloud'         // Random spherical distribution
  | 'grid_3d'              // Regular 3D grid
  | 'tunnel'               // Rings along Z-axis
  | 'explosion';           // Radial burst from center

export interface LayoutConfig {
  id: LayoutFormation;
  name: string;
  radiusRange: [number, number];
  supportsMultiple: boolean;
}

export const LAYOUT_FORMATIONS: LayoutConfig[] = [
  { id: 'centered_single', name: 'Centered', radiusRange: [0, 0], supportsMultiple: false },
  { id: 'spherical_shell', name: 'Spherical Shell', radiusRange: [1.5, 3.5], supportsMultiple: true },
  { id: 'double_ring', name: 'Double Ring', radiusRange: [1.5, 3.0], supportsMultiple: true },
  { id: 'vertical_stack', name: 'Vertical Stack', radiusRange: [0.5, 2.0], supportsMultiple: true },
  { id: 'orbital_planes', name: 'Orbital Planes', radiusRange: [2.0, 4.0], supportsMultiple: true },
  { id: 'fibonacci_spiral', name: 'Fibonacci Spiral', radiusRange: [1.0, 3.0], supportsMultiple: true },
  { id: 'cube_corners', name: 'Cube Corners', radiusRange: [1.5, 2.5], supportsMultiple: true },
  { id: 'icosahedron_vertices', name: 'Icosahedron', radiusRange: [2.0, 3.0], supportsMultiple: true },
  { id: 'random_cloud', name: 'Random Cloud', radiusRange: [1.5, 3.5], supportsMultiple: true },
  { id: 'grid_3d', name: '3D Grid', radiusRange: [2.0, 4.0], supportsMultiple: true },
  { id: 'tunnel', name: 'Tunnel', radiusRange: [1.5, 2.5], supportsMultiple: true },
  { id: 'explosion', name: 'Explosion', radiusRange: [2.0, 4.0], supportsMultiple: true },
];

// =============================================================================
// MOTION SYSTEM (12 Patterns)
// =============================================================================

export type MotionPattern = 
  | 'static'           // No base motion (audio only)
  | 'spin_y'           // Rotate around Y
  | 'spin_tumble'      // Rotate around all axes
  | 'orbit'            // Elements orbit center
  | 'breathe'          // Pulsing scale
  | 'wave_propagate'   // Wave travels through elements
  | 'oscillate_xz'     // Side-to-side + front-back
  | 'spiral_in_out'    // Spiral path toward/away from center
  | 'bounce'           // Vertical bounce with gravity
  | 'pendulum'         // Swing motion
  | 'flutter'          // Random micro-movements
  | 'drift';           // Slow random walk

export interface MotionConfig {
  id: MotionPattern;
  name: string;
  speedRange: [number, number];
  intensityRange: [number, number];
}

export const MOTION_PATTERNS: MotionConfig[] = [
  { id: 'static', name: 'Static', speedRange: [0, 0], intensityRange: [0, 0] },
  { id: 'spin_y', name: 'Spin Y', speedRange: [0.2, 0.8], intensityRange: [1, 1] },
  { id: 'spin_tumble', name: 'Tumble', speedRange: [0.1, 0.5], intensityRange: [0.5, 1.5] },
  { id: 'orbit', name: 'Orbit', speedRange: [0.3, 1.0], intensityRange: [0.5, 1.5] },
  { id: 'breathe', name: 'Breathe', speedRange: [0.5, 1.5], intensityRange: [0.1, 0.3] },
  { id: 'wave_propagate', name: 'Wave', speedRange: [1.0, 3.0], intensityRange: [0.2, 0.5] },
  { id: 'oscillate_xz', name: 'Oscillate', speedRange: [0.5, 1.5], intensityRange: [0.2, 0.5] },
  { id: 'spiral_in_out', name: 'Spiral', speedRange: [0.3, 0.8], intensityRange: [0.3, 0.8] },
  { id: 'bounce', name: 'Bounce', speedRange: [1.0, 2.0], intensityRange: [0.2, 0.5] },
  { id: 'pendulum', name: 'Pendulum', speedRange: [0.5, 1.2], intensityRange: [0.3, 0.7] },
  { id: 'flutter', name: 'Flutter', speedRange: [2.0, 4.0], intensityRange: [0.05, 0.15] },
  { id: 'drift', name: 'Drift', speedRange: [0.1, 0.3], intensityRange: [0.1, 0.3] },
];

// =============================================================================
// AUDIO MAPPING SYSTEM (10 Profiles)
// =============================================================================

export type AudioProfile = 
  | 'pulse_dominant'    // Bass drives big scale pulses
  | 'explode_on_beat'   // Bass causes radial expansion
  | 'breathe_heavy'     // Deep breathing with bass
  | 'jitter_focus'      // Highs drive intense jitter
  | 'wave_driven'       // Bass controls wave amplitude
  | 'rotation_focus'    // Mids drive heavy rotation
  | 'morph_heavy'       // Bass drives vertex morphing
  | 'strobe_reactive'   // All bands control flash intensity
  | 'gravity_pull'      // Bass pulls elements inward
  | 'organic_flow';     // Noise-based organic motion

export interface AudioMappingConfig {
  id: AudioProfile;
  name: string;
  bass: {
    target: 'scale' | 'expand' | 'morph' | 'position' | 'noise';
    intensity: [number, number]; // min, max multiplier
    attack: number;              // 0-1, higher = faster
    release: number;             // 0-1, higher = faster
  };
  mids: {
    target: 'rotation' | 'orbit' | 'twist' | 'sway' | 'wave';
    intensity: [number, number];
    attack: number;
    release: number;
  };
  highs: {
    target: 'jitter' | 'shimmer' | 'sparkle' | 'flicker' | 'edge';
    intensity: [number, number];
    attack: number;
    release: number;
  };
}

export const AUDIO_PROFILES: AudioMappingConfig[] = [
  {
    id: 'pulse_dominant',
    name: 'Pulse Dominant',
    bass: { target: 'scale', intensity: [0.3, 0.6], attack: 0.9, release: 0.3 },
    mids: { target: 'rotation', intensity: [0.1, 0.3], attack: 0.7, release: 0.4 },
    highs: { target: 'shimmer', intensity: [0.05, 0.15], attack: 0.95, release: 0.5 },
  },
  {
    id: 'explode_on_beat',
    name: 'Explode on Beat',
    bass: { target: 'expand', intensity: [0.4, 0.8], attack: 0.95, release: 0.2 },
    mids: { target: 'orbit', intensity: [0.2, 0.5], attack: 0.7, release: 0.4 },
    highs: { target: 'sparkle', intensity: [0.1, 0.25], attack: 0.9, release: 0.5 },
  },
  {
    id: 'breathe_heavy',
    name: 'Heavy Breathing',
    bass: { target: 'scale', intensity: [0.2, 0.5], attack: 0.6, release: 0.15 },
    mids: { target: 'sway', intensity: [0.1, 0.3], attack: 0.5, release: 0.3 },
    highs: { target: 'shimmer', intensity: [0.03, 0.1], attack: 0.8, release: 0.4 },
  },
  {
    id: 'jitter_focus',
    name: 'Jitter Focus',
    bass: { target: 'scale', intensity: [0.1, 0.25], attack: 0.8, release: 0.3 },
    mids: { target: 'twist', intensity: [0.15, 0.35], attack: 0.7, release: 0.4 },
    highs: { target: 'jitter', intensity: [0.1, 0.25], attack: 0.98, release: 0.6 },
  },
  {
    id: 'wave_driven',
    name: 'Wave Driven',
    bass: { target: 'noise', intensity: [0.3, 0.7], attack: 0.85, release: 0.25 },
    mids: { target: 'wave', intensity: [0.2, 0.5], attack: 0.7, release: 0.35 },
    highs: { target: 'edge', intensity: [0.05, 0.15], attack: 0.9, release: 0.5 },
  },
  {
    id: 'rotation_focus',
    name: 'Rotation Focus',
    bass: { target: 'scale', intensity: [0.15, 0.35], attack: 0.85, release: 0.3 },
    mids: { target: 'rotation', intensity: [0.3, 0.8], attack: 0.75, release: 0.4 },
    highs: { target: 'sparkle', intensity: [0.05, 0.15], attack: 0.9, release: 0.5 },
  },
  {
    id: 'morph_heavy',
    name: 'Heavy Morphing',
    bass: { target: 'morph', intensity: [0.3, 0.6], attack: 0.9, release: 0.25 },
    mids: { target: 'twist', intensity: [0.2, 0.4], attack: 0.7, release: 0.35 },
    highs: { target: 'flicker', intensity: [0.05, 0.12], attack: 0.95, release: 0.5 },
  },
  {
    id: 'strobe_reactive',
    name: 'Strobe Reactive',
    bass: { target: 'scale', intensity: [0.2, 0.5], attack: 0.95, release: 0.15 },
    mids: { target: 'rotation', intensity: [0.15, 0.4], attack: 0.85, release: 0.3 },
    highs: { target: 'flicker', intensity: [0.15, 0.35], attack: 0.98, release: 0.7 },
  },
  {
    id: 'gravity_pull',
    name: 'Gravity Pull',
    bass: { target: 'position', intensity: [0.2, 0.5], attack: 0.85, release: 0.2 },
    mids: { target: 'orbit', intensity: [0.15, 0.35], attack: 0.7, release: 0.4 },
    highs: { target: 'sparkle', intensity: [0.08, 0.2], attack: 0.9, release: 0.5 },
  },
  {
    id: 'organic_flow',
    name: 'Organic Flow',
    bass: { target: 'noise', intensity: [0.25, 0.55], attack: 0.75, release: 0.2 },
    mids: { target: 'sway', intensity: [0.2, 0.45], attack: 0.6, release: 0.35 },
    highs: { target: 'shimmer', intensity: [0.05, 0.12], attack: 0.85, release: 0.45 },
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getShapeConfig(id: ShapeFamily): ShapeConfig {
  return SHAPE_FAMILIES.find(s => s.id === id) || SHAPE_FAMILIES[0];
}

export function getLayoutConfig(id: LayoutFormation): LayoutConfig {
  return LAYOUT_FORMATIONS.find(l => l.id === id) || LAYOUT_FORMATIONS[0];
}

export function getMotionConfig(id: MotionPattern): MotionConfig {
  return MOTION_PATTERNS.find(m => m.id === id) || MOTION_PATTERNS[0];
}

export function getAudioConfig(id: AudioProfile): AudioMappingConfig {
  return AUDIO_PROFILES.find(a => a.id === id) || AUDIO_PROFILES[0];
}
