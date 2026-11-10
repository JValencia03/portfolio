import { useFrame } from "@react-three/fiber";
import { sceneFrame } from "./sceneFrame";

/**
 * Moves the camera along its axis toward the face that looks at it.
 * The distance for the current frame is decided by `SceneDirector`.
 */
export function CameraRig() {
  useFrame(({ camera }) => {
    if (camera.position.z !== sceneFrame.cameraZ) camera.position.z = sceneFrame.cameraZ;
  });

  return null;
}
