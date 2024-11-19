import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { Vector3, Matrix4 } from 'three';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { Projectile } from './Projectile';

const MOVE_SPEED = 8;
const JUMP_FORCE = 10;

export function Player() {
  const playerRef = useRef<RapierRigidBody>(null);
  const [projectiles, setProjectiles] = useState<any[]>([]);
  const [projectileId, setProjectileId] = useState(0);
  const [isGrounded, setIsGrounded] = useState(false);
  const { forward, backward, left, right, jump } = useKeyboardControls();
  const { camera } = useThree();

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      event.preventDefault();
      if (!playerRef.current) return;

      const position = playerRef.current.translation();
      const target = new Vector3(
        (event.clientX / window.innerWidth) * 40 - 20,
        2,
        (event.clientY / window.innerHeight) * 40 - 20
      );

      setProjectiles(prev => [...prev, {
        id: projectileId,
        position: new Vector3(position.x, position.y, position.z),
        type: event.button === 0 ? 'bow' : 'boomerang',
        target
      }]);
      setProjectileId(prev => prev + 1);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [projectileId]);

  useFrame(() => {
    if (!playerRef.current) return;

    // Calculate movement direction
    const moveDirection = new Vector3(0, 0, 0);

    // Add movement based on key presses
    if (forward) moveDirection.z -= 1;
    if (backward) moveDirection.z += 1;
    if (left) moveDirection.x -= 1;
    if (right) moveDirection.x += 1;

    // Get current velocity
    const currentVel = playerRef.current.linvel();

    // Apply movement if there's any input
    if (moveDirection.lengthSq() > 0) {
      // Normalize movement direction
      moveDirection.normalize();

      // Create movement vector aligned with camera
      const cameraAngle = -Math.PI / 4; // Fixed camera angle
      const movementVector = new Vector3(
        moveDirection.x * Math.cos(cameraAngle) - moveDirection.z * Math.sin(cameraAngle),
        0,
        moveDirection.x * Math.sin(cameraAngle) + moveDirection.z * Math.cos(cameraAngle)
      );

      // Apply movement speed
      playerRef.current.setLinvel({
        x: movementVector.x * MOVE_SPEED,
        y: currentVel.y,
        z: movementVector.z * MOVE_SPEED
      });
    } else {
      // Stop horizontal movement when no keys are pressed
      playerRef.current.setLinvel({
        x: 0,
        y: currentVel.y,
        z: 0
      });
    }

    // Handle jumping
    if (jump && isGrounded) {
      playerRef.current.setLinvel({
        x: currentVel.x,
        y: JUMP_FORCE,
        z: currentVel.z
      });
      setIsGrounded(false);
    }
  });

  return (
    <>
      <RigidBody
        ref={playerRef}
        position={[0, 5, 0]}
        enabledRotations={[false, false, false]}
        mass={1}
        lockRotations
        colliders="ball"
        onCollisionEnter={() => setIsGrounded(true)}
        onCollisionExit={() => setIsGrounded(false)}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </RigidBody>
      {projectiles.map(proj => (
        <Projectile
          key={proj.id}
          position={proj.position}
          type={proj.type}
          target={proj.target}
          onComplete={() => {
            setProjectiles(prev => prev.filter(p => p.id !== proj.id));
          }}
        />
      ))}
    </>
  );
}