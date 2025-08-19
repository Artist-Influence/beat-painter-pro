
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get geometry type from prompt
function getGeometryType(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('sphere') || lower.includes('ball') || lower.includes('orb')) return 'sphereGeometry';
  if (lower.includes('cube') || lower.includes('box')) return 'boxGeometry';
  if (lower.includes('cylinder') || lower.includes('tube')) return 'cylinderGeometry';
  if (lower.includes('cone') || lower.includes('pyramid')) return 'coneGeometry';
  if (lower.includes('torus') || lower.includes('donut') || lower.includes('ring')) return 'torusGeometry';
  if (lower.includes('plane') || lower.includes('flat')) return 'planeGeometry';
  return 'icosahedronGeometry'; // Default to interesting shape
}

// Helper function to get geometry args
function getGeometryArgs(prompt: string): string {
  const geometryType = getGeometryType(prompt);
  switch(geometryType) {
    case 'sphereGeometry': return '[1, 32, 32]';
    case 'boxGeometry': return '[1, 1, 1]';
    case 'cylinderGeometry': return '[0.5, 0.5, 1, 32]';
    case 'coneGeometry': return '[0.5, 1, 32]';
    case 'torusGeometry': return '[1, 0.3, 16, 100]';
    case 'planeGeometry': return '[2, 2, 32, 32]';
    case 'icosahedronGeometry': return '[1, 1]';
    default: return '[1, 1, 1]';
  }
}

/**
 * Detect prompts that should produce many objects / complex arrangements.
 */
function isComplexPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return [
    'field', 'fields', 'garden', 'flowers', 'flower', 'blossom', 'petal',
    'swarm', 'flock', 'school', 'cloud', 'grid', 'matrix', 'lattice',
    'stars', 'rain', 'snow', 'particles', 'many', 'multiple', 'array'
  ].some(k => p.includes(k));
}

/**
 * Advanced visualizer templates with full audio integration and texture support
 */
function getAdvancedVisualizer(prompt: string): string {
  const p = prompt.toLowerCase();
  
  // Extract key concepts for intelligent generation
  const isFloral = p.includes('flower') || p.includes('flowers') || p.includes('blossom') || p.includes('petal') || p.includes('garden') || p.includes('field');
  const isSwarm = p.includes('swarm') || p.includes('flock') || p.includes('school') || p.includes('cloud') || p.includes('particles') || p.includes('stars') || p.includes('rain') || p.includes('snow');
  const isGrid = p.includes('grid') || p.includes('matrix') || p.includes('lattice') || p.includes('mesh') || p.includes('network');
  const isOrganic = p.includes('organic') || p.includes('fluid') || p.includes('wave') || p.includes('blob') || p.includes('tentacle') || p.includes('neural');
  const isCrystal = p.includes('crystal') || p.includes('diamond') || p.includes('gem') || p.includes('prism') || p.includes('facet');

  // 1) Advanced Flower Field - Complex multi-component with full audio integration
  if (isFloral) {
    return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  const particlesRef = React.useRef([]);
  const windRef = React.useRef(0);
  
  // Audio sensitivity integration (simulated - would use useStudioStore in real app)
  const sensitivity = React.useMemo(() => ({
    bass: 1.2, mids: 0.9, highs: 1.1, overall: 1.0
  }), []);
  
  // Advanced frequency analysis with sensitivity
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1) * sensitivity.bass;
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1) * sensitivity.mids;  
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1) * sensitivity.highs;
    const beat = audioData.beatStrength * sensitivity.overall;
    return { bass, mids, highs, beat, hasAudio: bass + mids + highs > 0.01 };
  }, [audioData, sensitivity]);

  // Generate deterministic flower field layout
  const flowerData = React.useMemo(() => {
    const flowers = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    
    const count = 240;
    const gridSize = Math.ceil(Math.sqrt(count));
    const spacing = 0.28;
    
    for (let i = 0; i < count; i++) {
      const gx = i % gridSize;
      const gz = Math.floor(i / gridSize);
      const x = (gx - gridSize / 2) * spacing + (rnd() - 0.5) * 0.15;
      const z = (gz - gridSize / 2) * spacing + (rnd() - 0.5) * 0.15;
      
      flowers.push({
        x, z,
        height: 0.3 + rnd() * 0.4,
        stemWidth: 0.008 + rnd() * 0.004,
        petalCount: 5 + Math.floor(rnd() * 3),
        petalSize: 0.025 + rnd() * 0.015,
        phase: rnd() * Math.PI * 2,
        audioIndex: i % 32, // Map to specific frequency bin
        swayPhase: rnd() * Math.PI * 2
      });
    }
    return flowers;
  }, []);

  // Advanced animation with idle behavior
  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    windRef.current = Math.sin(t * 0.3) * 0.05; // Base wind simulation
    
    if (groupRef.current) {
      // Scene breathing when no audio
      if (!audioAnalysis.hasAudio) {
        groupRef.current.position.y = Math.sin(t * 0.5) * 0.02;
        groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.03;
      } else {
        // Audio-reactive scene movement
        groupRef.current.position.y = audioAnalysis.bass * 0.1;
        groupRef.current.rotation.y = audioAnalysis.mids * 0.2;
      }
    }
  });

  // Generate flower meshes with individual audio reactivity
  const flowers = flowerData.map((flower, i) => {
    const freqBin = Math.floor((flower.audioIndex / 32) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    const swayAmount = windRef.current + localIntensity * 0.3;
    
    return React.createElement('group', {
      key: i,
      position: [flower.x, 0, flower.z],
      rotation: [swayAmount * Math.sin(flower.swayPhase), 0, swayAmount * Math.cos(flower.swayPhase)]
    },
      // Stem with texture support
      React.createElement('mesh', { 
        position: [0, flower.height / 2, 0],
        scale: [1, 1 + audioAnalysis.bass * 0.3, 1]
      },
        React.createElement('cylinderGeometry', { args: [flower.stemWidth, flower.stemWidth * 0.7, flower.height, 8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.1,
          roughness: 0.9,
          emissive: '#ffffff',
          emissiveIntensity: 0.02 + audioAnalysis.bass * 0.08
        })
      ),
      // Flower center
      React.createElement('mesh', { 
        position: [0, flower.height, 0],
        scale: [1 + audioAnalysis.highs * 0.4, 1 + audioAnalysis.highs * 0.4, 1 + audioAnalysis.highs * 0.4]
      },
        React.createElement('sphereGeometry', { args: [0.02, 12, 12] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.3,
          roughness: 0.6,
          emissive: '#ffffff',
          emissiveIntensity: 0.1 + audioAnalysis.highs * 0.3
        })
      ),
      // Dynamic petals
      ...Array(flower.petalCount).fill(null).map((_, k) => {
        const angle = (k / flower.petalCount) * Math.PI * 2;
        const petalDistance = 0.04 + localIntensity * 0.02;
        return React.createElement('mesh', {
          key: 'petal' + k,
          position: [
            Math.cos(angle) * petalDistance,
            flower.height,
            Math.sin(angle) * petalDistance
          ],
          rotation: [-Math.PI/2 + audioAnalysis.mids * 0.3, angle, 0],
          scale: [1 + audioAnalysis.beat * 0.5, 1 + audioAnalysis.beat * 0.5, 1]
        },
          React.createElement('coneGeometry', { args: [flower.petalSize, 0.06, 8] }),
          React.createElement('meshStandardMaterial', {
            color: '#ffffff',
            metalness: 0.2,
            roughness: 0.7,
            emissive: '#ffffff',
            emissiveIntensity: 0.05 + audioAnalysis.mids * 0.2
          })
        );
      })
    );
  });

  // Add floating particles for ambiance
  const particles = Array(60).fill(null).map((_, i) => {
    const x = (Math.random() - 0.5) * 8;
    const y = 0.5 + Math.random() * 2;
    const z = (Math.random() - 0.5) * 8;
    
    return React.createElement('mesh', {
      key: 'particle' + i,
      position: [x + Math.sin(Date.now() * 0.001 + i) * 0.1, y + audioAnalysis.highs * 0.3, z],
      scale: [0.01 + audioAnalysis.beat * 0.02, 0.01 + audioAnalysis.beat * 0.02, 0.01 + audioAnalysis.beat * 0.02]
    },
      React.createElement('sphereGeometry', { args: [1, 6, 6] }),
      React.createElement('meshStandardMaterial', {
        color: '#ffffff',
        metalness: 0.8,
        roughness: 0.2,
        emissive: '#ffffff',
        emissiveIntensity: 0.15 + audioAnalysis.highs * 0.4,
        transparent: true,
        opacity: 0.6 + audioAnalysis.beat * 0.4
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.4 }),
    React.createElement('directionalLight', { position: [10, 10, 5], intensity: 0.8 }),
    React.createElement('pointLight', { 
      position: [0, 2, 0], 
      intensity: 0.5 + audioAnalysis.beat * 0.8,
      color: '#ffffff'
    }),
    ...flowers,
    ...particles
  );
};`;
  }

  // 2) Advanced Swarm/Particle System
  if (isSwarm) {
    return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  const particleRefs = React.useRef([]);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength, hasAudio: bass + mids + highs > 0.01 };
  }, [audioData]);

  const swarmData = React.useMemo(() => {
    const particles = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1103515245 + 12345) % 4294967296; return seed / 4294967296; }
    
    const count = 320;
    for (let i = 0; i < count; i++) {
      const r = 0.8 + rnd() * 1.5;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta),
        size: 0.015 + rnd() * 0.025,
        speed: 0.2 + rnd() * 0.8,
        phase: rnd() * Math.PI * 2,
        orbit: rnd() * Math.PI * 2,
        audioIndex: i % 128
      });
    }
    return particles;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      if (!audioAnalysis.hasAudio) {
        // Idle breathing motion
        groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
        groupRef.current.rotation.y = t * 0.05;
        groupRef.current.scale.setScalar(1 + Math.sin(t * 0.7) * 0.05);
      } else {
        // Audio-reactive motion
        groupRef.current.rotation.x = audioAnalysis.bass * 0.5;
        groupRef.current.rotation.y = t * (0.1 + audioAnalysis.mids);
        groupRef.current.scale.setScalar(1 + audioAnalysis.beat * 0.3);
      }
    }
  });

  const particles = swarmData.map((particle, i) => {
    const freqBin = Math.floor((particle.audioIndex / 128) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    
    return React.createElement('mesh', {
      key: i,
      position: [
        particle.x + Math.sin(particle.phase + particle.orbit) * (0.2 + localIntensity * 0.3),
        particle.y + Math.cos(particle.phase) * (0.1 + audioAnalysis.mids * 0.4),
        particle.z + Math.sin(particle.orbit) * (0.15 + audioAnalysis.highs * 0.2)
      ],
      scale: [
        particle.size * (1 + audioAnalysis.beat * 0.6),
        particle.size * (1 + audioAnalysis.beat * 0.6),
        particle.size * (1 + audioAnalysis.beat * 0.6)
      ]
    },
      React.createElement('sphereGeometry', { args: [1, 12, 12] }),
      React.createElement('meshStandardMaterial', {
        color: '#ffffff',
        metalness: 0.4,
        roughness: 0.4,
        emissive: '#ffffff',
        emissiveIntensity: 0.08 + localIntensity * 0.4,
        transparent: true,
        opacity: 0.7 + audioAnalysis.beat * 0.3
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.3 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 0.7 }),
    React.createElement('pointLight', { 
      position: [0, 0, 0], 
      intensity: 1 + audioAnalysis.beat * 2,
      distance: 10,
      color: '#ffffff'
    }),
    ...particles
  );
};`;
  }

  // 3) Advanced Grid/Matrix System
  if (isGrid) {
    return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength, hasAudio: bass + mids + highs > 0.01 };
  }, [audioData]);

  const gridData = React.useMemo(() => {
    const nodes = [];
    const size = 16;
    const spacing = 0.2;
    
    for (let x = -size/2; x < size/2; x++) {
      for (let y = -size/2; y < size/2; y++) {
        for (let z = -size/2; z < size/2; z++) {
          if ((Math.abs(x) + Math.abs(y) + Math.abs(z)) % 4 === 0) {
            nodes.push({
              position: [x * spacing, y * spacing, z * spacing],
              audioIndex: ((x + size/2) * size + (y + size/2)) % 256
            });
          }
        }
      }
    }
    return nodes;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      if (!audioAnalysis.hasAudio) {
        groupRef.current.rotation.x = t * 0.03;
        groupRef.current.rotation.y = t * 0.05;
        groupRef.current.rotation.z = t * 0.02;
      } else {
        groupRef.current.rotation.x = t * (0.05 + audioAnalysis.bass * 0.1);
        groupRef.current.rotation.y = t * (0.08 + audioAnalysis.mids * 0.15);
        groupRef.current.rotation.z = audioAnalysis.highs * 0.3;
      }
    }
  });

  const nodes = gridData.map((node, i) => {
    const localIntensity = audioData.frequency ? (audioData.frequency[node.audioIndex] || 0) / 255 : 0;
    const wavePhase = (node.position[0] + node.position[1] + node.position[2]) * 2;
    
    return React.createElement('mesh', {
      key: i,
      position: node.position,
      scale: [
        0.05 + localIntensity * 0.1 + Math.sin(wavePhase) * 0.02,
        0.05 + localIntensity * 0.1 + Math.sin(wavePhase) * 0.02,
        0.05 + localIntensity * 0.1 + Math.sin(wavePhase) * 0.02
      ]
    },
      React.createElement('boxGeometry', { args: [1, 1, 1] }),
      React.createElement('meshStandardMaterial', {
        color: '#ffffff',
        metalness: 0.6,
        roughness: 0.3,
        emissive: '#ffffff',
        emissiveIntensity: 0.05 + localIntensity * 0.3,
        wireframe: false
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.2 }),
    React.createElement('directionalLight', { position: [10, 10, 10], intensity: 0.8 }),
    ...nodes
  );
};`;
  }

  // Default to simple but enhanced template
  return getEnhancedDefaultVisualizer(prompt);
}

// Enhanced default visualizer with better audio reactivity and idle behavior
function getEnhancedDefaultVisualizer(prompt: string): string {
  const geometryType = getGeometryType(prompt);
  const geometryArgs = getGeometryArgs(prompt);
  
  return `return function CustomVisualizer(props) {
    const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
    const meshRef = React.useRef(null);
    const groupRef = React.useRef(null);
    const orbitRef = React.useRef(null);
    
    // Enhanced audio analysis
    const audioAnalysis = React.useMemo(() => {
      const freq = audioData.frequency || Array(256).fill(0);
      const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
      const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
      const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
      return { bass, mids, highs, beat: audioData.beatStrength, hasAudio: bass + mids + highs > 0.01 };
    }, [audioData]);
    
    // Advanced animation with idle behavior
    ReactThreeFiber.useFrame((state) => {
      const t = state.clock.getElapsedTime();
      
      if (meshRef.current) {
        if (!audioAnalysis.hasAudio) {
          // Elegant idle animation
          meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
          meshRef.current.rotation.y = t * 0.1;
          meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.1);
        } else {
          // Full audio reactivity
          meshRef.current.rotation.x = t * (0.2 + audioAnalysis.bass * 0.8) + audioAnalysis.bass * 2;
          meshRef.current.rotation.y = t * (0.15 + audioAnalysis.mids * 0.6) + audioAnalysis.mids * 3;
          meshRef.current.rotation.z = audioAnalysis.highs * 1.5;
          meshRef.current.scale.setScalar(1 + audioAnalysis.beat * 0.4 + audioAnalysis.bass * 0.3);
        }
      }
      
      if (groupRef.current) {
        if (!audioAnalysis.hasAudio) {
          groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
          groupRef.current.position.y = Math.sin(t * 0.4) * 0.03;
        } else {
          groupRef.current.rotation.z = audioAnalysis.mids * 0.3;
          groupRef.current.position.y = audioAnalysis.bass * 0.2;
        }
      }
      
      if (orbitRef.current) {
        orbitRef.current.rotation.x = t * (0.1 + audioAnalysis.highs * 0.2);
        orbitRef.current.rotation.y = t * (0.08 + audioAnalysis.mids * 0.15);
      }
    });
    
    // Create orbital elements for added complexity
    const orbitalElements = Array(8).fill(null).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 1.2 + Math.sin(angle * 3) * 0.3;
      return React.createElement('mesh', {
        key: 'orbit' + i,
        position: [Math.cos(angle) * radius, Math.sin(angle * 2) * 0.2, Math.sin(angle) * radius],
        scale: [0.08 + audioAnalysis.highs * 0.1, 0.08 + audioAnalysis.highs * 0.1, 0.08 + audioAnalysis.highs * 0.1]
      },
        React.createElement('sphereGeometry', { args: [1, 8, 8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.7,
          roughness: 0.2,
          emissive: '#ffffff',
          emissiveIntensity: 0.1 + audioAnalysis.highs * 0.3,
          transparent: true,
          opacity: 0.6 + audioAnalysis.beat * 0.4
        })
      );
    });
    
    return React.createElement('group', { ref: groupRef },
      React.createElement('ambientLight', { intensity: 0.4 }),
      React.createElement('directionalLight', { position: [5, 5, 5], intensity: 0.8 }),
      React.createElement('pointLight', { 
        position: [0, 0, 0], 
        intensity: 0.6 + audioAnalysis.beat * 1.2,
        color: '#ffffff'
      }),
      
      // Main mesh
      React.createElement('mesh', { ref: meshRef },
        React.createElement('${geometryType}', { args: ${geometryArgs} }),
        React.createElement('meshStandardMaterial', { 
          color: '#ffffff',
          metalness: 0.4,
          roughness: 0.6,
          emissive: '#ffffff',
          emissiveIntensity: 0.08 + audioAnalysis.beat * 0.2
        })
      ),
      
      // Orbital elements
      React.createElement('group', { ref: orbitRef }, ...orbitalElements)
    );
  };`;
}

// Working default visualizer (kept but ensure white materials)
function getDefaultVisualizer(prompt: string): string {
  const geometryType = getGeometryType(prompt);
  const geometryArgs = getGeometryArgs(prompt);
  
  return `return function CustomVisualizer(props) {
    const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
    const meshRef = React.useRef(null);
    const groupRef = React.useRef(null);
    
    const frequency = audioData.frequency || Array(256).fill(0);
    
    const bass = React.useMemo(() => {
      let sum = 0;
      for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
      return Math.min(sum / 86 / 255, 1.0);
    }, [frequency]);
    
    const mids = React.useMemo(() => {
      let sum = 0;
      for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
      return Math.min(sum / 85 / 255, 1.0);
    }, [frequency]);
    
    const highs = React.useMemo(() => {
      let sum = 0;
      for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
      return Math.min(sum / 85 / 255, 1.0);
    }, [frequency]);
    
    ReactThreeFiber.useFrame((state) => {
      if (meshRef.current) {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.x = t * 0.5 + bass * 2;
        meshRef.current.rotation.y = t * 0.3 + mids * 3;
        meshRef.current.scale.setScalar(1 + bass * 0.5);
      }
      if (groupRef.current) {
        groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
      }
    });
    
    return React.createElement(
      'group',
      { ref: groupRef },
      React.createElement('ambientLight', { intensity: 0.5 }),
      React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
      React.createElement('mesh', { ref: meshRef },
        React.createElement('${geometryType}', { args: ${geometryArgs} }),
        React.createElement('meshStandardMaterial', { 
          color: '#ffffff',
          metalness: 0.3,
          roughness: 0.7,
          emissive: '#ffffff',
          emissiveIntensity: 0.1
        })
      )
    );
  };`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, referenceImage, mixStyles, userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check quota before generating
    const { data: quotaCheck } = await supabase.rpc('check_visualizer_quota', { 
      _user_id: userId 
    });

    if (!quotaCheck) {
      return new Response(JSON.stringify({ error: 'Quota exceeded. You can create up to 5 custom visualizers. Delete some to create new ones.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prefer advanced template if prompt indicates plurality/fields/swarms
    let cleanedCode = '';
    if (isComplexPrompt(prompt)) {
      cleanedCode = getAdvancedVisualizer(prompt);
      console.log('[generator] Using advanced template for prompt:', prompt);
    } else if (openAIApiKey) {
      try {
        // Use a VERY specific prompt that produces working code
        const systemPrompt = `Generate a React Three Fiber visualizer function.
Output ONLY this exact code structure, modifying ONLY the geometry type and animation values:

return function CustomVisualizer(props) {
  const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const meshRef = React.useRef(null);
  const groupRef = React.useRef(null);
  
  const frequency = audioData.frequency || Array(256).fill(0);
  
  const bass = React.useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const mids = React.useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  const highs = React.useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  ReactThreeFiber.useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.x = t * 0.5 + bass * 2;
      meshRef.current.rotation.y = t * 0.3 + mids * 3;
      meshRef.current.scale.setScalar(1 + bass * 0.5);
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
    }
  });
  
  return React.createElement(
    'group',
    { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.5 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
    React.createElement('mesh', { ref: meshRef },
      React.createElement('${getGeometryType(prompt)}', { args: ${getGeometryArgs(prompt)} }),
      React.createElement('meshStandardMaterial', { 
        color: '#ffffff',
        metalness: 0.3,
        roughness: 0.7,
        emissive: '#ffffff',
        emissiveIntensity: 0.1
      })
    )
  );
};

The user wants: ${prompt}
Modify ONLY the geometry type (boxGeometry, sphereGeometry, etc.) and rotation speeds.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Generate the code exactly as shown, choosing appropriate geometry.' }
            ],
            max_completion_tokens: 1500,
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.choices?.[0]?.message?.content) {
          cleanedCode = data.choices[0].message.content
            .replace(/```javascript/g, '')
            .replace(/```js/g, '')
            .replace(/```/g, '')
            .trim();
        }
      } catch (error) {
        console.error('OpenAI generation failed:', error);
      }
    }
    
    // If OpenAI failed or no API key, or we still don't have code, use default logic
    if (!cleanedCode || !cleanedCode.includes('return function') || !cleanedCode.includes('React.createElement')) {
      const usedDefault = isComplexPrompt(prompt) ? '[advanced-local]' : '[enhanced-default]';
      console.log('Using fallback visualizer for prompt:', prompt, usedDefault);
      cleanedCode = isComplexPrompt(prompt) ? getAdvancedVisualizer(prompt) : getEnhancedDefaultVisualizer(prompt);
    }
    
    // Extract visualizer name from the cleaned code
    const nameMatch = cleanedCode.match(/function (\w+)/);
    const visualizerName = nameMatch ? nameMatch[1] : 'CustomVisualizer';
    
    // Generate a simple emoji based on geometry type or complex template
    let previewEmoji = '✨';
    if (prompt.toLowerCase().match(/flower|flowers|blossom|petal|garden|field/)) previewEmoji = '🌸';
    else if (prompt.toLowerCase().match(/swarm|cloud|particles|stars|rain|snow/)) previewEmoji = '🫧';
    else if (prompt.toLowerCase().match(/grid|matrix|lattice/)) previewEmoji = '🔲';
    else {
      const geometryType = getGeometryType(prompt);
      switch(geometryType) {
        case 'sphereGeometry': previewEmoji = '🔮'; break;
        case 'boxGeometry': previewEmoji = '📦'; break;
        case 'cylinderGeometry': previewEmoji = '🥫'; break;
        case 'coneGeometry': previewEmoji = '🔺'; break;
        case 'torusGeometry': previewEmoji = '🍩'; break;
        case 'planeGeometry': previewEmoji = '🟫'; break;
        case 'icosahedronGeometry': previewEmoji = '💎'; break;
      }
    }

    // Store the generated visualizer in the database
    const { data: savedVisualizer, error: saveError } = await supabase
      .from('custom_visualizers')
      .insert({
        user_id: userId,
        name: visualizerName,
        description: prompt,
        prompt: prompt,
        jsx_code: cleanedCode,
        scale_factor: isComplexPrompt(prompt) ? 0.35 : 0.25,
        preview_emoji: previewEmoji,
        is_public: false
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving visualizer:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save visualizer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      visualizer: savedVisualizer,
      code: cleanedCode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-visualizer function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
