import { Canvas, useFrame, useThree } from "react-three-fiber";
import './VrmApp.css';
import { useEffect, useRef } from "react";
import { useVRM } from "./useVRM";
import { PerspectiveCamera } from "three";
import { VRM } from "@pixiv/three-vrm";

const MyMesh = (props:{vrm: VRM | null}) => {
    const vrm = props.vrm;

    const { camera } = useThree(); // アスペクト比を取得
    // const { current: camera } = useRef(new PerspectiveCamera(75, viewport.aspect));
    useFrame((state, delta) => {
        const blinkValue = (Math.sin(state.clock.elapsedTime * 1/3) ** 1024) +
        (Math.sin(state.clock.elapsedTime * 4/7) ** 1024);
        vrm?.expressionManager?.setValue('blink', blinkValue);
        // vrm?.expressionManager?.setValue('blink', 0);

        const waitingValue = (1 - (Math.sin(state.clock.elapsedTime * 4/5) ** 4)) * Math.PI / 32;
        if (vrm?.humanoid) {
            const leg = vrm.humanoid.getNormalizedBoneNode(
                "leftUpperLeg"
            );
            if (leg)
                leg.rotation.x = waitingValue
        }

        const aaValue = (Math.sin(state.clock.elapsedTime * 1/3) ** 1024);
        const ihValue = (Math.sin(state.clock.elapsedTime * 4/7) ** 1024);
        vrm?.expressionManager?.setValue("aa", aaValue);
        vrm?.expressionManager?.setValue("ih", ihValue);

        vrm?.humanoid?.setNormalizedPose({
            "chest": {
                "rotation": [
                  -0.06000000000000005,
                  0.07000000000000006,
                  0.06000000000000005,
                  0.99
                ]
              },
              "head": {
                "rotation": [
                  -0.050000000000000044,
                  0,
                  0,
                  1
                ]
              },
              "hips": {
                "rotation": [
                  0.24,
                  0.010000000000000009,
                  -0.22999999999999998,
                  0.94
                ]
              },
              "leftEye": {
                "rotation": [
                  -0.0008863517578849751,
                  -0.006332837093514317,
                  -0.00000561323605535759,
                  0.9999795545526917
                ]
              },
              "leftFoot": {
                "rotation": [
                  -0.16999999999999993,
                  0.1499999999999999,
                  0.08999999999999997,
                  0.97
                ]
              },
              "leftHand": {
                "rotation": [
                  0.15000000000000002,
                  -0.27,
                  -0.10000000000000009,
                  0.95
                ]
              },
              "leftIndexDistal": {
                "rotation": [
                  0,
                  0,
                  0.050000000000000044,
                  1
                ]
              },
              "leftIndexIntermediate": {
                "rotation": [
                  0.050000000000000044,
                  0.1100000000000001,
                  -0.040000000000000036,
                  0.99
                ]
              },
              "leftIndexProximal": {
                "rotation": [
                  -0.020000000000000018,
                  -0.26,
                  0.18999999999999995,
                  0.95
                ]
              },
              "leftLittleDistal": {
                "rotation": [
                  0,
                  0,
                  -0.71,
                  0.71
                ]
              },
              "leftLittleIntermediate": {
                "rotation": [
                  0,
                  0,
                  -0.71,
                  0.71
                ]
              },
              "leftLittleProximal": {
                "rotation": [
                  -0.06000000000000005,
                  -0.06000000000000005,
                  -0.7,
                  0.7
                ]
              },
              "leftLowerArm": {
                "rotation": [
                  -0.1100000000000001,
                  -0.84,
                  0.30000000000000004,
                  0.44999999999999996
                ]
              },
              "leftLowerLeg": {
                "rotation": [
                  0.31999999999999995,
                  -0.20999999999999996,
                  0.040000000000000036,
                  0.9199999999999999
                ]
              },
              "leftMiddleDistal": {
                "rotation": [
                  0,
                  0,
                  0.07999999999999996,
                  1
                ]
              },
              "leftMiddleIntermediate": {
                "rotation": [
                  0,
                  0,
                  0.07999999999999996,
                  1
                ]
              },
              "leftMiddleProximal": {
                "rotation": [
                  0,
                  0,
                  0.21999999999999997,
                  0.97
                ]
              },
              "leftRingDistal": {
                "rotation": [
                  0,
                  0,
                  -0.71,
                  0.71
                ]
              },
              "leftRingIntermediate": {
                "rotation": [
                  0,
                  0,
                  -0.71,
                  0.71
                ]
              },
              "leftRingProximal": {
                "rotation": [
                  0,
                  0,
                  -0.71,
                  0.71
                ]
              },
              "leftShoulder": {
                "rotation": [
                  -0.010000000000000009,
                  0.07000000000000006,
                  0.18000000000000005,
                  0.98
                ]
              },
              "leftThumbDistal": {
                "rotation": [
                  0,
                  0.71,
                  0,
                  0.71
                ]
              },
            //   "leftThumbIntermediate": {
            //     "rotation": [
            //       0,
            //       0.44999999999999996,
            //       0,
            //       0.8899999999999999
            //     ]
            //   },
              "leftThumbProximal": {
                "rotation": [
                  0,
                  0.28,
                  0,
                  0.96
                ]
              },
              "leftUpperArm": {
                "rotation": [
                  -0.07000000000000006,
                  -0.19999999999999996,
                  -0.3400000000000001,
                  0.9199999999999999
                ]
              },
              "leftUpperLeg": {
                "rotation": [
                  -0.33000000000000007,
                  -0.020000000000000018,
                  0.18000000000000005,
                  0.9199999999999999
                ]
              },
              "neck": {
                "rotation": [
                  0.08999999999999997,
                  -0.010000000000000009,
                  0.12,
                  0.99
                ]
              },
              "rightEye": {
                "rotation": [
                  -0.0008863295405021166,
                  -0.00949917627121997,
                  -0.000008419783732699719,
                  0.9999544889639833
                ]
              },
              "rightFoot": {
                "rotation": [
                  -0.07000000000000006,
                  -0.07999999999999996,
                  0.040000000000000036,
                  0.99
                ]
              },
              "rightHand": {
                "rotation": [
                  0.06999999999999995,
                  0.30000000000000004,
                  -0.1100000000000001,
                  0.94
                ]
              },
              "rightIndexDistal": {
                "rotation": [
                  0,
                  0,
                  -0.08000000000000007,
                  1
                ]
              },
              "rightIndexIntermediate": {
                "rotation": [
                  0,
                  0,
                  -0.1499999999999999,
                  0.99
                ]
              },
              "rightIndexProximal": {
                "rotation": [
                  0,
                  0,
                  -0.050000000000000044,
                  1
                ]
              },
              "rightLittleDistal": {
                "rotation": [
                  0,
                  0,
                  0.71,
                  0.71
                ]
              },
              "rightLittleIntermediate": {
                "rotation": [
                  0,
                  0,
                  0.71,
                  0.71
                ]
              },
              "rightLittleProximal": {
                "rotation": [
                  -0.040000000000000036,
                  0.040000000000000036,
                  0.71,
                  0.71
                ]
              },
              "rightLowerArm": {
                "rotation": [
                  -0.030000000000000027,
                  0.78,
                  -0.43999999999999995,
                  0.43999999999999995
                ]
              },
              "rightLowerLeg": {
                "rotation": [
                  0.13,
                  0.08000000000000007,
                  -0.020000000000000018,
                  0.99
                ]
              },
              "rightMiddleDistal": {
                "rotation": [
                  0,
                  0,
                  -0.10000000000000009,
                  1
                ]
              },
              "rightMiddleIntermediate": {
                "rotation": [
                  0,
                  0,
                  -0.1100000000000001,
                  0.99
                ]
              },
              "rightMiddleProximal": {
                "rotation": [
                  -0.030000000000000027,
                  -0.12,
                  -0.10000000000000009,
                  0.99
                ]
              },
              "rightRingDistal": {
                "rotation": [
                  0,
                  0,
                  0.71,
                  0.71
                ]
              },
              "rightRingIntermediate": {
                "rotation": [
                  0,
                  0,
                  0.71,
                  0.71
                ]
              },
              "rightRingProximal": {
                "rotation": [
                  0,
                  0,
                  0.71,
                  0.71
                ]
              },
              "rightShoulder": {
                "rotation": [
                  -0.020000000000000018,
                  -0.13,
                  -0.16999999999999993,
                  0.98
                ]
              },
              "rightThumbDistal": {
                "rotation": [
                  0.09999999999999998,
                  -0.7,
                  -0.10000000000000009,
                  0.7
                ]
              },
            //   "rightThumbIntermediate": {
            //     "rotation": [
            //       0,
            //       -0.44999999999999996,
            //       0,
            //       0.8899999999999999
            //     ]
            //   },
              "rightThumbProximal": {
                "rotation": [
                  0,
                  -0.28,
                  0,
                  0.96
                ]
              },
              "rightUpperArm": {
                "rotation": [
                  -0.030000000000000027,
                  0.07000000000000006,
                  0.4,
                  0.9099999999999999
                ]
              },
              "rightUpperLeg": {
                "rotation": [
                  -0.3500000000000001,
                  0.1299999999999999,
                  0.19999999999999996,
                  0.8999999999999999
                ]
              },
              "spine": {
                "rotation": [
                  -0.07000000000000006,
                  0,
                  0.06999999999999995,
                  1
                ]
              },
              "upperChest": {
                "rotation": [
                  -0.1499999999999999,
                  0,
                  0.08999999999999997,
                  0.99
                ]
              }       
             });

        vrm?.update(delta);
    });

    useEffect(() => {
        camera.position.set(0, 1, 1);
    }, [camera]);
    return (
        <>
            <directionalLight />
            {vrm && <primitive object={vrm.scene} />}
        </>
    );
};

const VrmApp: React.FC = () => {
    const [vrm, loadVRM] = useVRM();
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
        <Canvas>
            <MyMesh vrm={vrm} />
        </Canvas>
        </>
    );
};

export default VrmApp;