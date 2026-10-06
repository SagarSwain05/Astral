import { useRef, useMemo, useCallback, Suspense, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";
import AsteroidOrbit from "./AsteroidOrbit";
import CameraController from "./CameraController";

// ─── Real Earth Texture URLs (Three.js / NASA Blue Marble) ──────────
const TEX_BASE =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r161/examples/textures/planets/";
const EARTH_DAY_URL = TEX_BASE + "earth_atmos_2048.jpg";
const EARTH_NIGHT_URL = TEX_BASE + "earth_lights_2048.png";
const EARTH_NORMAL_URL = TEX_BASE + "earth_normal_2048.jpg";
const EARTH_SPECULAR_URL = TEX_BASE + "earth_specular_2048.jpg";
const EARTH_CLOUDS_URL = TEX_BASE + "earth_clouds_1024.png";

// ─── Earth with day/night shader ─────────────────────────────────────

const earthVertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vUv = uv;
        // Transform normal to world space (not view space)
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const earthFragmentShader = `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D specularMap;
    uniform vec3 sunDirection;
    uniform float time;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec4 dayColor = texture2D(dayTexture, vUv);
        vec4 nightColor = texture2D(nightTexture, vUv);
        float specMask = texture2D(specularMap, vUv).r;

        vec3 N = normalize(vWorldNormal);
        vec3 sunDir = normalize(sunDirection);

        // Dot product: positive = facing sun (day), negative = away (night)
        float sunDot = dot(N, sunDir);

        // Smooth day/night terminator band - adjusted for brighter dayside
        float dayFactor = smoothstep(-0.25, 0.15, sunDot);

        // Specular on oceans (specular map: bright = water)
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 halfDir = normalize(sunDir + viewDir);
        float spec = pow(max(dot(N, halfDir), 0.0), 64.0) * specMask;
        vec3 specular = spec * vec3(0.5, 0.6, 0.7) * dayFactor;

        // Night light twinkle
        float twinkle = 0.92 + 0.08 * sin(time * 1.5 + vUv.x * 100.0 + vUv.y * 60.0);
        vec3 night = nightColor.rgb * twinkle * 1.6;

        // Brighten dayside for better visibility
        vec3 brightDay = dayColor.rgb * 1.35;

        // Mix day & night
        vec3 color = mix(night, brightDay, dayFactor) + specular;

        // Soft atmospheric rim glow
        float rim = 1.0 - max(dot(N, viewDir), 0.0);
        float rimGlow = pow(rim, 3.0);
        vec3 rimColor = vec3(0.3, 0.6, 1.0) * rimGlow * 0.35;
        color += rimColor;

        gl_FragColor = vec4(color, 1.0);
    }
`;

const Earth = ({ sunHourAngle = null }) => {
  const earthRef = useRef();
  const cloudsRef = useRef();

  // Load real NASA satellite textures
  const [
    dayTexture,
    nightTexture,
    normalTexture,
    specularTexture,
    cloudsTexture,
  ] = useLoader(THREE.TextureLoader, [
    EARTH_DAY_URL,
    EARTH_NIGHT_URL,
    EARTH_NORMAL_URL,
    EARTH_SPECULAR_URL,
    EARTH_CLOUDS_URL,
  ]);

  // Configure textures
  useMemo(() => {
    [
      dayTexture,
      nightTexture,
      normalTexture,
      specularTexture,
      cloudsTexture,
    ].forEach((t) => {
      if (t) {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
      }
    });
  }, [dayTexture, nightTexture, normalTexture, specularTexture, cloudsTexture]);

  // Compute sun direction from hour angle (sun rotates 360° per 24h)
  // sunHourAngle = null → use current real time
  const sunDirectionRef = useRef(new THREE.Vector3(5, 2, 3).normalize());

  const earthUniforms = useMemo(
    () => ({
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      specularMap: { value: specularTexture },
      sunDirection: { value: sunDirectionRef.current },
      time: { value: 0 },
    }),
    [dayTexture, nightTexture, specularTexture],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Determine current hour for sun position
    const now = new Date();
    const realHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const hour = sunHourAngle !== null ? sunHourAngle : realHour;

    // Sun angle: 12:00 UTC = sun facing camera (positive Z), rotates full circle over 24h
    // At hour 0 (midnight UTC), sun is behind the Earth; at 12, it faces front
    const sunAngle = ((hour - 12) / 24) * Math.PI * 2;
    sunDirectionRef.current
      .set(Math.sin(sunAngle) * 5, 1.5, Math.cos(sunAngle) * 5)
      .normalize();

    if (earthRef.current) {
      earthRef.current.rotation.y = t * 0.04;
      earthRef.current.material.uniforms.time.value = t;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    <group>
      {/* Earth with day/night shader */}
      <mesh ref={earthRef} renderOrder={0}>
        <sphereGeometry args={[2, 128, 64]} />
        <shaderMaterial
          uniforms={earthUniforms}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef} renderOrder={1}>
        <sphereGeometry args={[2.025, 64, 64]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
          depthTest={true}
          blending={THREE.NormalBlending}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Atmosphere glow — softer, realistic blue */}
      <Atmosphere radius={2} color="#4da6ff" intensity={0.8} falloff={3.5} />

      {/* Inner haze */}
      <Atmosphere radius={2} color="#88ccff" intensity={0.3} falloff={5.0} />
    </group>
  );
};

// ─── Reference grid rings ────────────────────────────────────────────
const ReferenceRing = ({
  radius,
  color = "#ffffff",
  opacity = 0.08,
  dashed = false,
}) => {
  const lineRef = useRef();

  const points = useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.cos(theta) * radius,
          0,
          Math.sin(theta) * radius,
        ),
      );
    }
    return pts;
  }, [radius]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    // Required for dashed lines to work properly
    geom.computeBoundingSphere();
    return geom;
  }, [points]);

  // Compute line distances after mount for dashed lines
  useEffect(() => {
    if (lineRef.current && dashed) {
      lineRef.current.computeLineDistances();
    }
  }, [dashed, geometry]);

  return (
    <line ref={lineRef} geometry={geometry} frustumCulled={false} renderOrder={-1}>
      {dashed ? (
        <lineDashedMaterial
          color={color}
          transparent
          opacity={opacity}
          dashSize={0.3}
          gapSize={0.15}
          depthWrite={false}
        />
      ) : (
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      )}
    </line>
  );
};

// ─── Sun light flare ─────────────────────────────────────────────────
const SunLight = ({ sunHourAngle = null }) => {
  const dirLightRef = useRef();

  useFrame(() => {
    if (!dirLightRef.current) return;
    const now = new Date();
    const realHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const hour = sunHourAngle !== null ? sunHourAngle : realHour;
    const sunAngle = ((hour - 12) / 24) * Math.PI * 2;
    dirLightRef.current.position.set(
      Math.sin(sunAngle) * 50,
      20,
      Math.cos(sunAngle) * 50,
    );
  });

  return (
    <group>
      <directionalLight
        ref={dirLightRef}
        position={[50, 20, 30]}
        intensity={2.0}
        color="#fff5e6"
        castShadow={false}
      />
      {/* Fill light for dark side visibility - increased for better nightside visibility */}
      <ambientLight intensity={0.25} color="#2a3a5a" />
      {/* Subtle back-rim light */}
      <pointLight
        position={[-20, -10, -15]}
        intensity={0.3}
        color="#4444aa"
        distance={60}
      />
    </group>
  );
};

// ─── Main Scene ──────────────────────────────────────────────────────
const Scene = ({
  asteroids = [],
  timeOffset = 0,
  selectedAsteroid = null,
  hoveredAsteroid = null,
  onSelectAsteroid,
  onHoverAsteroid,
  onDeselectAsteroid,
  sunHourAngle = null,
}) => {
  const orbitControlsRef = useRef();

  return (
    <>
      {/* Lighting */}
      <SunLight sunHourAngle={sunHourAngle} />

      {/* Stars */}
      <Stars
        radius={200}
        depth={80}
        count={8000}
        factor={5}
        saturation={0.1}
        fade
        speed={0.5}
      />

      {/* Earth — wrapped in Suspense for texture loading */}
      <Suspense fallback={null}>
        <Earth sunHourAngle={sunHourAngle} />
      </Suspense>

      {/* Reference distance rings */}
      <ReferenceRing radius={3.5} color="#00d4ff" opacity={0.06} />
      <ReferenceRing radius={5} color="#6366f1" opacity={0.04} dashed />
      <ReferenceRing radius={7} color="#6366f1" opacity={0.03} dashed />

      {/* Asteroid orbits */}
      {asteroids.slice(0, 20).map((asteroid) => (
        <AsteroidOrbit
          key={asteroid.neo_reference_id || asteroid._id}
          asteroid={asteroid}
          timeOffset={timeOffset}
          selected={
            selectedAsteroid?.neo_reference_id === asteroid.neo_reference_id
          }
          hovered={
            hoveredAsteroid?.neo_reference_id === asteroid.neo_reference_id
          }
          onSelect={onSelectAsteroid}
          onHover={onHoverAsteroid}
          showOrbit={true}
          showLabel={asteroid.isPotentiallyHazardous}
        />
      ))}

      {/* OrbitControls - always enabled for 3D maneuvering */}
      <OrbitControls
        ref={orbitControlsRef}
        enableZoom
        enablePan={false}
        minDistance={4}
        maxDistance={30}
        zoomSpeed={2}
        rotateSpeed={0.8}
        autoRotate={!selectedAsteroid}
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Camera transition controller */}
      <CameraController
        targetAsteroid={selectedAsteroid}
        timeOffset={timeOffset}
        enabled={true}
        orbitControlsRef={orbitControlsRef}
        onDeselect={onDeselectAsteroid}
      />
    </>
  );
};

// ─── Main exported component ─────────────────────────────────────────
const Earth3D = ({
  asteroids = [],
  className = "",
  timeOffset = 0,
  selectedAsteroid = null,
  hoveredAsteroid = null,
  onSelectAsteroid,
  onHoverAsteroid,
  onDeselectAsteroid,
  sunHourAngle = null,
}) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 3, 9], fov: 45, near: 0.01, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          logarithmicDepthBuffer: true,
        }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
        onPointerMissed={() => onDeselectAsteroid?.()}
      >
        <Scene
          asteroids={asteroids}
          timeOffset={timeOffset}
          selectedAsteroid={selectedAsteroid}
          hoveredAsteroid={hoveredAsteroid}
          onSelectAsteroid={onSelectAsteroid}
          onHoverAsteroid={onHoverAsteroid}
          onDeselectAsteroid={onDeselectAsteroid}
          sunHourAngle={sunHourAngle}
        />
      </Canvas>
    </div>
  );
};

export default Earth3D;

