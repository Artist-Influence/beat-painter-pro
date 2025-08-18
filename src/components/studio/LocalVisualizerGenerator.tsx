import React from 'react';

// Template-based generation for testing (no OpenAI required)
export function generateLocalVisualizer(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  // Determine geometry based on keywords
  let geometry = 'icosahedronGeometry';
  let args = '[1, 1]';
  let animationStyle = 'basic';
  
  if (lower.includes('sphere') || lower.includes('ball') || lower.includes('orb')) {
    geometry = 'sphereGeometry';
    args = '[1, 32, 32]';
    animationStyle = 'pulse';
  } else if (lower.includes('cube') || lower.includes('box')) {
    geometry = 'boxGeometry';
    args = '[1, 1, 1]';
    animationStyle = 'spin';
  } else if (lower.includes('ring') || lower.includes('torus') || lower.includes('donut')) {
    geometry = 'torusGeometry';
    args = '[1, 0.3, 16, 100]';
    animationStyle = 'twist';
  } else if (lower.includes('cylinder') || lower.includes('tube')) {
    geometry = 'cylinderGeometry';
    args = '[0.5, 0.5, 1, 32]';
    animationStyle = 'wobble';
  } else if (lower.includes('cone') || lower.includes('pyramid')) {
    geometry = 'coneGeometry';
    args = '[0.5, 1, 32]';
    animationStyle = 'sway';
  }
  
  // Get animation code based on style
  const getAnimationCode = (style: string) => {
    switch(style) {
      case 'pulse':
        return `
        meshRef.current.rotation.x = t * 0.3 + bass * 1.5;
        meshRef.current.rotation.y = t * 0.2 + mids * 2;
        meshRef.current.scale.setScalar(1 + bass * 0.8 + Math.sin(t * 2) * 0.1);`;
      case 'spin':
        return `
        meshRef.current.rotation.x = t * 0.5 + bass * 2;
        meshRef.current.rotation.y = t * 0.7 + mids * 3;
        meshRef.current.rotation.z = t * 0.3 + highs * 1.5;
        meshRef.current.scale.setScalar(1 + bass * 0.5);`;
      case 'twist':
        return `
        meshRef.current.rotation.x = t * 0.4 + bass * 1.8;
        meshRef.current.rotation.z = t * 0.8 + mids * 2.5;
        meshRef.current.scale.set(1 + bass * 0.3, 1 + mids * 0.4, 1 + highs * 0.2);`;
      case 'wobble':
        return `
        meshRef.current.rotation.x = Math.sin(t * 0.8) * 0.3 + bass * 1.2;
        meshRef.current.rotation.y = t * 0.6 + mids * 2.2;
        meshRef.current.position.y = Math.sin(t * 1.2) * 0.2 + bass * 0.3;
        meshRef.current.scale.setScalar(1 + bass * 0.6);`;
      case 'sway':
        return `
        meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.4 + bass * 1.5;
        meshRef.current.rotation.y = t * 0.4 + mids * 2;
        meshRef.current.position.x = Math.sin(t * 0.7) * 0.2;
        meshRef.current.scale.setScalar(1 + bass * 0.7);`;
      default:
        return `
        meshRef.current.rotation.x = t * 0.5 + bass * 2;
        meshRef.current.rotation.y = t * 0.3 + mids * 3;
        meshRef.current.scale.setScalar(1 + bass * 0.5);`;
    }
  };
  
  // Return working code with proper template structure
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
        const t = state.clock.getElapsedTime();${getAnimationCode(animationStyle)}
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
        React.createElement('${geometry}', { args: ${args} }),
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

// Available templates for user selection
export const VISUALIZER_TEMPLATES = {
  sphere: {
    name: 'Pulsing Sphere',
    geometry: 'sphereGeometry',
    args: '[1, 32, 32]',
    animation: 'pulse',
    emoji: '🔮'
  },
  cube: {
    name: 'Spinning Cube',
    geometry: 'boxGeometry',
    args: '[1, 1, 1]',
    animation: 'spin',
    emoji: '📦'
  },
  torus: {
    name: 'Twisting Ring',
    geometry: 'torusGeometry',
    args: '[1, 0.3, 16, 100]',
    animation: 'twist',
    emoji: '🍩'
  },
  cylinder: {
    name: 'Wobbling Cylinder',
    geometry: 'cylinderGeometry',
    args: '[0.5, 0.5, 1, 32]',
    animation: 'wobble',
    emoji: '🥫'
  },
  cone: {
    name: 'Swaying Cone',
    geometry: 'coneGeometry',
    args: '[0.5, 1, 32]',
    animation: 'sway',
    emoji: '🔺'
  },
  icosahedron: {
    name: 'Diamond Crystal',
    geometry: 'icosahedronGeometry',
    args: '[1, 1]',
    animation: 'basic',
    emoji: '💎'
  }
};