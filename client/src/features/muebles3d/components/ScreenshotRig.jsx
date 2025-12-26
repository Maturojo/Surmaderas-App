import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function ScreenshotRig({ onReady }) {
  const { gl, camera, scene } = useThree();

  useEffect(() => {
    if (!onReady) return;

    const api = {
      captureOne: () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      },
      captureViews: (target = new THREE.Vector3(0, 0.9, 0)) => {
        const oldPos = camera.position.clone();
        const oldQuat = camera.quaternion.clone();

        const dist = Math.max(6, camera.position.length());
        const views = [
          { key: "front", pos: new THREE.Vector3(0, 1.2, dist) },
          { key: "back", pos: new THREE.Vector3(0, 1.2, -dist) },
          { key: "left", pos: new THREE.Vector3(-dist, 1.2, 0) },
          { key: "right", pos: new THREE.Vector3(dist, 1.2, 0) },
        ];

        const shots = {};
        for (const v of views) {
          camera.position.copy(v.pos);
          camera.lookAt(target);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);

          gl.render(scene, camera);
          shots[v.key] = gl.domElement.toDataURL("image/png");
        }

        camera.position.copy(oldPos);
        camera.quaternion.copy(oldQuat);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);

        return shots;
      },
    };

    onReady(api);
  }, [gl, camera, scene, onReady]);

  return null;
}
