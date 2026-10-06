import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getPositionAtTime, estimateOrbit } from "../../utils/orbitalMechanics";

// Smooth easing function - Hermite interpolation
const smoothStep = (t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 3 * t2 - 2 * t3;
};

/**
 * CameraController — manages smooth camera transitions to asteroid targets
 * Works alongside OrbitControls by updating the camera position and target
 */
const CameraController = ({
  targetAsteroid = null,
  timeOffset = 0,
  enabled = true,
  orbitControlsRef = null,
  onDeselect,
}) => {
  const { camera } = useThree();

  // Animation state
  const isTransitioning = useRef(false);
  const transitionProgress = useRef(1);
  const transitionDuration = useRef(2.0);

  // Camera positions
  const startCameraPos = useRef(new THREE.Vector3(0, 3, 9));
  const targetCameraPos = useRef(new THREE.Vector3(0, 3, 9));
  const midCameraPos = useRef(new THREE.Vector3(0, 5, 12));

  // Look-at targets
  const startTarget = useRef(new THREE.Vector3(0, 0, 0));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Track current asteroid ID
  const currentAsteroidId = useRef(null);

  // Default Earth view
  const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 3, 9);
  const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

  // Calculate asteroid position
  const getAsteroidPosition = (asteroid, offset) => {
    if (!asteroid) return null;
    try {
      const orbital = estimateOrbit(asteroid);
      return getPositionAtTime(orbital, offset);
    } catch (e) {
      console.error("Failed to compute asteroid position:", e);
      return null;
    }
  };

  // Trigger transition when asteroid selection changes
  useEffect(() => {
    if (!enabled) return;

    const newAsteroidId = targetAsteroid?.neo_reference_id || null;

    // Skip if same asteroid
    if (newAsteroidId === currentAsteroidId.current) return;

    console.log("CameraController: Transitioning from", currentAsteroidId.current, "to", newAsteroidId);
    currentAsteroidId.current = newAsteroidId;

    // Capture current camera state
    startCameraPos.current.copy(camera.position);

    if (orbitControlsRef?.current) {
      startTarget.current.copy(orbitControlsRef.current.target);
      orbitControlsRef.current.enabled = false;
    } else {
      startTarget.current.copy(DEFAULT_TARGET);
    }

    if (targetAsteroid) {
      // === TRANSITION TO ASTEROID ===
      transitionDuration.current = 2.0;

      const astPos = getAsteroidPosition(targetAsteroid, timeOffset);

      if (astPos) {
        console.log("CameraController: Asteroid position:", astPos.x.toFixed(2), astPos.y.toFixed(2), astPos.z.toFixed(2));

        // Camera target: look at asteroid
        targetLookAt.current.copy(astPos);

        // Camera position: offset from asteroid
        const direction = astPos.clone().normalize();
        const offsetVec = direction.multiplyScalar(3.5);

        targetCameraPos.current.copy(astPos).add(offsetVec);
        targetCameraPos.current.y += 2;

        // Midpoint for arc (lift camera up during transition)
        midCameraPos.current.lerpVectors(startCameraPos.current, targetCameraPos.current, 0.5);
        midCameraPos.current.y += 3;

        console.log("CameraController: Target camera pos:", targetCameraPos.current.x.toFixed(2), targetCameraPos.current.y.toFixed(2), targetCameraPos.current.z.toFixed(2));
      } else {
        console.warn("CameraController: Could not calculate asteroid position!");
        // Fallback - just stay where we are
        targetCameraPos.current.copy(camera.position);
        targetLookAt.current.copy(startTarget.current);
        midCameraPos.current.copy(camera.position);
      }
    } else {
      // === TRANSITION BACK TO EARTH ===
      transitionDuration.current = 1.8;

      targetCameraPos.current.copy(DEFAULT_CAMERA_POS);
      targetLookAt.current.copy(DEFAULT_TARGET);

      // Arc up and back for dramatic reveal
      midCameraPos.current.lerpVectors(startCameraPos.current, targetCameraPos.current, 0.5);
      midCameraPos.current.y += 4;
      midCameraPos.current.z += 3;

      console.log("CameraController: Returning to Earth view");
    }

    // Start the transition
    transitionProgress.current = 0;
    isTransitioning.current = true;

  }, [targetAsteroid, enabled, camera, orbitControlsRef, timeOffset]);

  // Follow asteroid position when time changes (no full transition)
  useEffect(() => {
    if (!enabled || !targetAsteroid || isTransitioning.current) return;

    const astPos = getAsteroidPosition(targetAsteroid, timeOffset);
    if (astPos && orbitControlsRef?.current) {
      orbitControlsRef.current.target.lerp(astPos, 0.1);
    }
  }, [timeOffset, targetAsteroid, enabled, orbitControlsRef]);

  // Animation loop
  useFrame((_, delta) => {
    if (!enabled || !isTransitioning.current) return;

    // Advance progress
    transitionProgress.current += delta / transitionDuration.current;

    if (transitionProgress.current >= 1) {
      transitionProgress.current = 1;
    }

    // Smooth easing
    const t = smoothStep(transitionProgress.current);

    // Quadratic Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    const u = 1 - t;
    const u2 = u * u;
    const t2 = t * t;
    const ut2 = 2 * u * t;

    const newPos = new THREE.Vector3(
      u2 * startCameraPos.current.x + ut2 * midCameraPos.current.x + t2 * targetCameraPos.current.x,
      u2 * startCameraPos.current.y + ut2 * midCameraPos.current.y + t2 * targetCameraPos.current.y,
      u2 * startCameraPos.current.z + ut2 * midCameraPos.current.z + t2 * targetCameraPos.current.z
    );

    camera.position.copy(newPos);

    // Linear interpolation for look-at target
    const newTarget = new THREE.Vector3().lerpVectors(startTarget.current, targetLookAt.current, t);

    if (orbitControlsRef?.current) {
      orbitControlsRef.current.target.copy(newTarget);
    }
    camera.lookAt(newTarget);

    // End transition
    if (transitionProgress.current >= 1) {
      isTransitioning.current = false;
      console.log("CameraController: Transition complete");

      if (orbitControlsRef?.current) {
        orbitControlsRef.current.enabled = true;
        orbitControlsRef.current.update();
      }
    }
  });

  return null;
};

export default CameraController;
