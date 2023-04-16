import { Canvas, useFrame, useThree } from "react-three-fiber";
import './VrmApp.css';
import { useEffect, useRef } from "react";
import { useVRM } from "./useVRM";
import { AnimationMixer, Vector3 } from "three";
import { VRM } from "@pixiv/three-vrm";
import { CameraControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";

const MyMesh = (props:{vrm: VRM | null, mixer: AnimationMixer | null, fadeToAction: any}) => {
    const vrm = props.vrm;
    const mixer = props.mixer;

    const { camera, scene } = useThree(); // アスペクト比を取得

    useEffect(() => {
        if (vrm) {
            console.log('add scene');
            scene.add(vrm.scene);
        }
    }, [vrm]);

    // const { current: camera } = useRef(new PerspectiveCamera(75, viewport.aspect));
    let previousMotionClock = 0;
    useFrame((state, delta) => {
        if (!previousMotionClock) {
            previousMotionClock = state.clock.elapsedTime;
        }
        if (false && state.clock.elapsedTime - previousMotionClock >= 10) {
            const actions = ['Idle', 'ArmStretching', 'Bored']
            const action = actions[Math.floor(Math.random() * actions.length)];
            console.log(action);
            props.fadeToAction(action, 0.5);
            previousMotionClock = state.clock.elapsedTime;
        }
        const blinkValue = (Math.sin(state.clock.elapsedTime * 1/3) ** 1024) +
        (Math.sin(state.clock.elapsedTime * 4/7) ** 1024);
        vrm?.expressionManager?.setValue('blink', blinkValue);

        const aaValue = (Math.sin(state.clock.elapsedTime * 1/3) ** 1024);
        const ihValue = (Math.sin(state.clock.elapsedTime * 4/7) ** 1024);
        vrm?.expressionManager?.setValue("aa", aaValue);
        vrm?.expressionManager?.setValue("ih", ihValue);

        // 目線をカメラに向ける
        if (vrm && vrm.lookAt) vrm.lookAt.target = camera;
        // if (vrm && vrm.lookAt) vrm.lookAt.lookAt(new Vector3(...state.mouse.toArray(), 0));
        camera.lookAt(0, 1, -3);

        mixer?.update(delta);
        vrm?.update(delta);
    });

    useEffect(() => {
        // camera.position.set(0, 1.5, 0.5);
        camera.position.set(0, 1.55, 0.6);
    }, [camera]);
    return (
        <>
            <directionalLight />
            {vrm && <primitive object={vrm.scene} />}
        </>
    );
};

const VrmApp: React.FC = () => {
    const {vrm, loadVRM, fadeToAction, mixer, setExpression, clearExpression} = useVRM();
    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
      ): void => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const url = URL.createObjectURL(event.target.files![0]);
        loadVRM(url);
      };
    return (
        <>
        <input type="file" accept=".vrm" onChange={handleFileChange} />
        <button onClick={() => fadeToAction('Idle', 2, vrm)}>Idle</button>
        <button onClick={() => fadeToAction('Bored', 2, vrm)}>Bored</button>
        <button onClick={() => fadeToAction('ArmStretching', 2, vrm)}>ArmStretching</button>
        {/* <button onClick={() => fadeToAction('Typing', 2, vrm)}>Typing</button> */}
        <button onClick={() => setExpression('happy', 1, vrm!)}>happy</button>
        <button onClick={() => setExpression('sad', 1, vrm!)}>sad</button>
        <button onClick={() => setExpression('angry', 1, vrm!)}>angry</button>
        <button onClick={() => setExpression('relaxed', 1, vrm!)}>relaxed</button>
        <button onClick={() => clearExpression(vrm!)}>clearExpression</button>
            <Canvas>
                {/* <OrthographicCamera makeDefault position={[0, 0, 0]} /> */}
                {/* <CameraControls makeDefault/> */}
                <boxBufferGeometry args={[1, 1, 1]} />
                <MyMesh vrm={vrm} mixer={mixer} fadeToAction={fadeToAction} />
            </Canvas>
        </>
    );
};

export default VrmApp;