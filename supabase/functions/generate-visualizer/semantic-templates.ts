// Semantic object generation templates for accurate visualizers

export function generateSemanticVisualizer(prompt: string, analysis: {
  category: string;
  semanticBreakdown: string[];
  objectCount: number;
  enhancedPrompt: string;
}): string {
  
  const { category, semanticBreakdown, objectCount, enhancedPrompt } = analysis;
  
  // Vehicle template (airplanes, cars, boats, etc.)
  if (category === 'vehicles' || prompt.toLowerCase().includes('airplane') || prompt.toLowerCase().includes('plane') || prompt.toLowerCase().includes('aircraft')) {
    return generateAirplaneFleet(objectCount, enhancedPrompt);
  }
  
  // Nature template (flowers, trees, etc.)
  if (category === 'nature' || prompt.toLowerCase().includes('flower') || prompt.toLowerCase().includes('garden') || prompt.toLowerCase().includes('field')) {
    return generateFlowerField(objectCount, enhancedPrompt);
  }
  
  // Architecture template (buildings, cities, etc.)
  if (category === 'architecture' || prompt.toLowerCase().includes('building') || prompt.toLowerCase().includes('city') || prompt.toLowerCase().includes('house')) {
    return generateCityscape(objectCount, enhancedPrompt);
  }
  
  // Default to semantic multi-object template
  return generateSemanticMultiObject(prompt, analysis);
}

function generateAirplaneFleet(count: number, description: string): string {
  const fleetSize = Math.min(Math.max(count, 50), 150); // 50-150 airplanes
  return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  const airplanesRef = React.useRef([]);
  
  // Advanced audio analysis with sensitivity mapping
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const beat = Math.min(audioData.beatStrength || 0, 1);
    return { bass, mids, highs, beat, hasAudio: bass + mids + highs > 0.01 };
  }, [audioData]);

  // Generate realistic airplane fleet data
  const airplaneData = React.useMemo(() => {
    const airplanes = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    
    for (let i = 0; i < ${fleetSize}; i++) {
      // Spherical distribution for aerial formation
      const radius = 1.5 + rnd() * 1.0;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      
      airplanes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta),
        scale: 0.08 + rnd() * 0.04,
        speed: 0.3 + rnd() * 0.7,
        bankAngle: (rnd() - 0.5) * 0.5,
        pitchAngle: (rnd() - 0.5) * 0.3,
        rollPhase: rnd() * Math.PI * 2,
        audioIndex: i % 64, // Individual frequency mapping
        orbitRadius: radius,
        orbitSpeed: 0.1 + rnd() * 0.2
      });
    }
    return airplanes;
  }, []);

  // Advanced animation with realistic airplane behavior
  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      // Formation flight patterns
      if (!audioAnalysis.hasAudio) {
        // Gentle formation flying when no audio
        groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.1;
        groupRef.current.position.y = Math.sin(t * 0.3) * 0.05;
      } else {
        // Audio-reactive formation changes
        groupRef.current.rotation.y = t * (0.05 + audioAnalysis.mids * 0.2);
        groupRef.current.position.y = audioAnalysis.bass * 0.3;
        groupRef.current.scale.setScalar(1 + audioAnalysis.beat * 0.15);
      }
    }
  });

  // Generate individual airplanes with realistic component geometry
  const airplanes = airplaneData.map((plane, i) => {
    const freqBin = Math.floor((plane.audioIndex / 64) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    const timeOffset = i * 0.1;
    const time = Date.now() * 0.001 + timeOffset;
    
    // Individual airplane motion
    const bankMotion = plane.bankAngle + audioAnalysis.mids * 0.4 + Math.sin(time * 0.5) * 0.2;
    const pitchMotion = plane.pitchAngle + audioAnalysis.bass * 0.3;
    const altitudeBoost = audioAnalysis.bass * 0.4;
    
    return React.createElement('group', {
      key: i,
      position: [
        plane.x + Math.sin(time * plane.orbitSpeed) * 0.2,
        plane.y + altitudeBoost + Math.sin(time * 0.3 + plane.rollPhase) * 0.1,
        plane.z + Math.cos(time * plane.orbitSpeed) * 0.2
      ],
      rotation: [pitchMotion, bankMotion, Math.sin(plane.rollPhase + time) * 0.1],
      scale: [
        plane.scale * (1 + localIntensity * 0.3),
        plane.scale * (1 + localIntensity * 0.3),
        plane.scale * (1 + localIntensity * 0.3)
      ]
    },
      // Fuselage (main body) - cylindrical
      React.createElement('mesh', { 
        position: [0, 0, 0],
        rotation: [0, 0, Math.PI / 2]
      },
        React.createElement('cylinderGeometry', { args: [0.3, 0.4, 2.5, 8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.6,
          roughness: 0.3,
          emissive: '#ffffff',
          emissiveIntensity: 0.03 + localIntensity * 0.1
        })
      ),
      
      // Left Wing - rectangular
      React.createElement('mesh', { 
        position: [-1.2, 0, 0.3],
        scale: [1 + audioAnalysis.highs * 0.2, 1, 1]
      },
        React.createElement('boxGeometry', { args: [2, 0.1, 0.8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.7,
          roughness: 0.2,
          emissive: '#ffffff',
          emissiveIntensity: 0.02 + audioAnalysis.mids * 0.08
        })
      ),
      
      // Right Wing - rectangular
      React.createElement('mesh', { 
        position: [1.2, 0, 0.3],
        scale: [1 + audioAnalysis.highs * 0.2, 1, 1]
      },
        React.createElement('boxGeometry', { args: [2, 0.1, 0.8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.7,
          roughness: 0.2,
          emissive: '#ffffff',
          emissiveIntensity: 0.02 + audioAnalysis.mids * 0.08
        })
      ),
      
      // Tail - triangular
      React.createElement('mesh', { 
        position: [0, 0.4, -1],
        rotation: [0, 0, 0],
        scale: [1, 1 + audioAnalysis.highs * 0.3, 1]
      },
        React.createElement('coneGeometry', { args: [0.3, 0.8, 4] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.5,
          roughness: 0.4,
          emissive: '#ffffff',
          emissiveIntensity: 0.04 + audioAnalysis.highs * 0.12
        })
      ),
      
      // Propeller - rotating disc
      React.createElement('mesh', { 
        position: [0, 0, 1.4],
        rotation: [0, 0, time * (2 + localIntensity * 8)]
      },
        React.createElement('torusGeometry', { args: [0.6, 0.03, 8, 32] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.9,
          roughness: 0.1,
          emissive: '#ffffff',
          emissiveIntensity: 0.08 + localIntensity * 0.3,
          transparent: true,
          opacity: 0.7 + audioAnalysis.beat * 0.3
        })
      )
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.3 }),
    React.createElement('directionalLight', { position: [10, 10, 5], intensity: 0.7 }),
    React.createElement('pointLight', { 
      position: [0, 2, 0], 
      intensity: 0.8 + audioAnalysis.beat * 1.2,
      color: '#ffffff',
      distance: 12
    }),
    ...airplanes
  );
};`;
}

function generateFlowerField(count: number, description: string): string {
  const flowerCount = Math.min(Math.max(count, 80), 200); // 80-200 flowers
  return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength || 0, hasAudio: bass + mids + highs > 0.01 };
  }, [audioData]);

  const flowerData = React.useMemo(() => {
    const flowers = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1103515245 + 12345) % 4294967296; return seed / 4294967296; }
    
    const gridSize = Math.ceil(Math.sqrt(${flowerCount}));
    const spacing = 0.35;
    
    for (let i = 0; i < ${flowerCount}; i++) {
      const gx = i % gridSize;
      const gz = Math.floor(i / gridSize);
      const x = (gx - gridSize / 2) * spacing + (rnd() - 0.5) * 0.2;
      const z = (gz - gridSize / 2) * spacing + (rnd() - 0.5) * 0.2;
      
      flowers.push({
        x, z,
        stemHeight: 0.4 + rnd() * 0.5,
        stemRadius: 0.01 + rnd() * 0.005,
        petalCount: 5 + Math.floor(rnd() * 4),
        petalLength: 0.08 + rnd() * 0.04,
        centerSize: 0.02 + rnd() * 0.01,
        swayPhase: rnd() * Math.PI * 2,
        bloomPhase: rnd() * Math.PI * 2,
        audioIndex: i % 32
      });
    }
    return flowers;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current && !audioAnalysis.hasAudio) {
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.05;
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.02;
    }
  });

  const flowers = flowerData.map((flower, i) => {
    const freqBin = Math.floor((flower.audioIndex / 32) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    const time = Date.now() * 0.001 + i * 0.1;
    
    // Realistic flower swaying
    const swayAmount = Math.sin(time * 0.5 + flower.swayPhase) * 0.1 + localIntensity * 0.2;
    const bloomFactor = 1 + audioAnalysis.beat * 0.4;
    
    return React.createElement('group', {
      key: i,
      position: [flower.x, 0, flower.z],
      rotation: [swayAmount * 0.3, 0, swayAmount]
    },
      // Stem - cylindrical
      React.createElement('mesh', { 
        position: [0, flower.stemHeight / 2, 0],
        scale: [1, 1 + audioAnalysis.bass * 0.3, 1]
      },
        React.createElement('cylinderGeometry', { args: [flower.stemRadius, flower.stemRadius * 0.8, flower.stemHeight, 6] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.1,
          roughness: 0.8,
          emissive: '#ffffff',
          emissiveIntensity: 0.02 + localIntensity * 0.06
        })
      ),
      
      // Flower center - spherical
      React.createElement('mesh', { 
        position: [0, flower.stemHeight, 0],
        scale: [bloomFactor, bloomFactor, bloomFactor]
      },
        React.createElement('sphereGeometry', { args: [flower.centerSize, 8, 8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.3,
          roughness: 0.6,
          emissive: '#ffffff',
          emissiveIntensity: 0.1 + audioAnalysis.highs * 0.3
        })
      ),
      
      // Individual petals - cone shaped
      ...Array(flower.petalCount).fill(null).map((_, k) => {
        const angle = (k / flower.petalCount) * Math.PI * 2;
        const petalDistance = flower.petalLength * (0.7 + localIntensity * 0.3);
        const petalRotation = audioAnalysis.mids * 0.2 + Math.sin(time + flower.bloomPhase + k) * 0.1;
        
        return React.createElement('mesh', {
          key: 'petal' + k,
          position: [
            Math.cos(angle) * petalDistance,
            flower.stemHeight,
            Math.sin(angle) * petalDistance
          ],
          rotation: [-Math.PI/2 + petalRotation, angle, 0],
          scale: [bloomFactor, bloomFactor, 1]
        },
          React.createElement('coneGeometry', { args: [flower.petalLength * 0.6, 0.12, 6] }),
          React.createElement('meshStandardMaterial', {
            color: '#ffffff',
            metalness: 0.2,
            roughness: 0.7,
            emissive: '#ffffff',
            emissiveIntensity: 0.04 + audioAnalysis.mids * 0.15
          })
        );
      }),
      
      // Leaves - plane geometry
      ...Array(2 + Math.floor(i % 3)).fill(null).map((_, l) => {
        const leafAngle = (l / 3) * Math.PI * 2 + flower.swayPhase;
        const leafHeight = flower.stemHeight * (0.3 + l * 0.2);
        
        return React.createElement('mesh', {
          key: 'leaf' + l,
          position: [
            Math.cos(leafAngle) * 0.05,
            leafHeight,
            Math.sin(leafAngle) * 0.05
          ],
          rotation: [swayAmount + audioAnalysis.mids * 0.2, leafAngle, Math.PI/2]
        },
          React.createElement('planeGeometry', { args: [0.04, 0.08] }),
          React.createElement('meshStandardMaterial', {
            color: '#ffffff',
            metalness: 0.1,
            roughness: 0.9,
            emissive: '#ffffff',
            emissiveIntensity: 0.01 + localIntensity * 0.04,
            side: 2 // DoubleSide
          })
        );
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.4 }),
    React.createElement('directionalLight', { position: [5, 8, 3], intensity: 0.8 }),
    React.createElement('pointLight', { 
      position: [0, 1.5, 0], 
      intensity: 0.6 + audioAnalysis.beat * 0.9,
      color: '#ffffff'
    }),
    ...flowers
  );
};`;
}

function generateCityscape(count: number, description: string): string {
  const buildingCount = Math.min(Math.max(count, 40), 120); // 40-120 buildings
  return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength || 0 };
  }, [audioData]);

  const buildingData = React.useMemo(() => {
    const buildings = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    
    const gridSize = Math.ceil(Math.sqrt(${buildingCount}));
    const spacing = 0.4;
    
    for (let i = 0; i < ${buildingCount}; i++) {
      const gx = i % gridSize;
      const gz = Math.floor(i / gridSize);
      const x = (gx - gridSize / 2) * spacing + (rnd() - 0.5) * 0.1;
      const z = (gz - gridSize / 2) * spacing + (rnd() - 0.5) * 0.1;
      
      const height = 0.3 + rnd() * 1.2;
      buildings.push({
        x, z, height,
        width: 0.15 + rnd() * 0.1,
        depth: 0.15 + rnd() * 0.1,
        windowCount: Math.floor(height * 8) + 2,
        audioIndex: i % 48,
        pulsePhase: rnd() * Math.PI * 2
      });
    }
    return buildings;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.02 + audioAnalysis.beat * 0.1;
      groupRef.current.scale.setScalar(1 + audioAnalysis.bass * 0.15);
    }
  });

  const buildings = buildingData.map((building, i) => {
    const freqBin = Math.floor((building.audioIndex / 48) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    const time = Date.now() * 0.001;
    
    const buildingPulse = 1 + localIntensity * 0.3;
    const structuralSway = Math.sin(time * 0.2 + building.pulsePhase) * 0.02 + audioAnalysis.bass * 0.05;
    
    return React.createElement('group', {
      key: i,
      position: [building.x, 0, building.z],
      rotation: [structuralSway, 0, 0]
    },
      // Main building structure - box
      React.createElement('mesh', { 
        position: [0, building.height / 2, 0],
        scale: [buildingPulse, 1 + audioAnalysis.beat * 0.2, buildingPulse]
      },
        React.createElement('boxGeometry', { args: [building.width, building.height, building.depth] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.4,
          roughness: 0.6,
          emissive: '#ffffff',
          emissiveIntensity: 0.03 + localIntensity * 0.15
        })
      ),
      
      // Windows - smaller boxes with pulsing lights
      ...Array(building.windowCount).fill(null).map((_, w) => {
        const floor = Math.floor(w / 4);
        const windowX = ((w % 4) - 1.5) * building.width * 0.2;
        const windowY = (floor + 0.5) * (building.height / Math.ceil(building.windowCount / 4));
        const windowPulse = 1 + Math.sin(time * 2 + w + building.pulsePhase) * 0.3 + audioAnalysis.highs * 0.5;
        
        return React.createElement('mesh', {
          key: 'window' + w,
          position: [windowX, windowY, building.depth / 2 + 0.001]
        },
          React.createElement('boxGeometry', { args: [building.width * 0.15, building.height * 0.08, 0.01] }),
          React.createElement('meshStandardMaterial', {
            color: '#ffffff',
            metalness: 0.8,
            roughness: 0.2,
            emissive: '#ffffff',
            emissiveIntensity: 0.2 + windowPulse * 0.4,
            transparent: true,
            opacity: 0.7 + audioAnalysis.mids * 0.3
          })
        );
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.2 }),
    React.createElement('directionalLight', { position: [10, 15, 5], intensity: 0.6 }),
    React.createElement('pointLight', { 
      position: [0, 3, 0], 
      intensity: 1.5 + audioAnalysis.beat * 2,
      color: '#ffffff',
      distance: 15
    }),
    ...buildings
  );
};`;
}

function generateSemanticMultiObject(prompt: string, analysis: any): string {
  return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength || 0 };
  }, [audioData]);

  const objectData = React.useMemo(() => {
    const objects = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1103515245 + 12345) % 4294967296; return seed / 4294967296; }
    
    const count = ${Math.min(analysis.objectCount || 100, 250)};
    for (let i = 0; i < count; i++) {
      const radius = 0.8 + rnd() * 1.5;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      
      objects.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta),
        scale: 0.03 + rnd() * 0.06,
        rotSpeed: 0.5 + rnd() * 1.5,
        phase: rnd() * Math.PI * 2,
        audioIndex: i % 64
      });
    }
    return objects;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * (0.1 + audioAnalysis.beat * 0.3);
      groupRef.current.scale.setScalar(1 + audioAnalysis.bass * 0.2);
    }
  });

  const objects = objectData.map((obj, i) => {
    const freqBin = Math.floor((obj.audioIndex / 64) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    const time = Date.now() * 0.001;
    
    return React.createElement('mesh', {
      key: i,
      position: [
        obj.x + Math.sin(time * obj.rotSpeed + obj.phase) * (0.1 + localIntensity * 0.2),
        obj.y + Math.cos(time * 0.3 + obj.phase) * 0.05,
        obj.z + Math.sin(time * 0.8 + obj.phase) * 0.08
      ],
      rotation: [
        time * obj.rotSpeed + audioAnalysis.bass * 0.5,
        time * 0.7 + audioAnalysis.mids * 0.8,
        obj.phase + audioAnalysis.highs * 0.3
      ],
      scale: [
        obj.scale * (1 + localIntensity * 0.5),
        obj.scale * (1 + localIntensity * 0.5),
        obj.scale * (1 + localIntensity * 0.5)
      ]
    },
      React.createElement('icosahedronGeometry', { args: [1, 1] }),
      React.createElement('meshStandardMaterial', {
        color: '#ffffff',
        metalness: 0.5,
        roughness: 0.4,
        emissive: '#ffffff',
        emissiveIntensity: 0.05 + localIntensity * 0.3
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.3 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 0.7 }),
    React.createElement('pointLight', { 
      position: [0, 0, 0], 
      intensity: 1 + audioAnalysis.beat * 1.5,
      color: '#ffffff'
    }),
    ...objects
  );
};`;
}