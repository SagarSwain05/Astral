import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Shader: Atmosphere Fresnel glow ─────────────────────────────────
const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const atmosphereFragmentShader = `
    uniform vec3 glowColor;
    uniform vec3 viewVector;
    uniform float intensity;
    uniform float falloff;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
        float glow = pow(rim, falloff) * intensity;
        gl_FragColor = vec4(glowColor, glow);
    }
`;

/** Outer atmospheric glow shell */
const Atmosphere = ({
  radius = 2,
  color = "#4db8ff",
  intensity = 0.8,
  falloff = 3.5,
}) => {
  const ref = useRef();

  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      viewVector: { value: new THREE.Vector3(0, 0, 1) },
      intensity: { value: intensity },
      falloff: { value: falloff },
    }),
    [color, intensity, falloff],
  );

  useFrame(({ camera }) => {
    if (ref.current) {
      uniforms.viewVector.value.copy(camera.position).normalize();
    }
  });

  return (
    <mesh ref={ref} scale={1.18} renderOrder={2}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default Atmosphere;
