import { Canvas, useFrame } from "react-three-fiber";
import './VrmApp.css';
import { useRef } from "react";

const MyMesh = () => {
    const cube = useRef<import("three").Mesh>(null);
    useFrame(() => {
      if (cube.current) {
        cube.current.rotation.x += 0.01;
        cube.current.rotation.y += 0.01;
      }
    });
    return (
        <mesh ref={cube}>
            <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
            <meshBasicMaterial attach="material" color={0x00ff00} />
        </mesh>
    );
};

const VrmApp: React.FC = () => {
    return (
        <Canvas>
            <MyMesh/>
        </Canvas>
    );
};

export default VrmApp;