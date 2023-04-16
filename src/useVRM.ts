import { VRM, VRMExpressionPresetName, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useEffect, useRef, useState } from "react";
import { useThree } from "react-three-fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { loadMixamoAnimation } from "./loadMixamoAnimation";
import { AnimationAction, AnimationMixer } from "three";

const actions:{[key: string]: AnimationAction} = {};
let previousAction: AnimationAction | null = null;
let currentAction: AnimationAction | null = null;

const useVRM = () => {
  const { current: loader } = useRef(new GLTFLoader());
  const [vrm, setVRM] = useState<VRM | null>(null);
  const [mixer, setMixer] = useState<AnimationMixer | null>(null);
//   const [actions, setActions] = useState<{[key: string]: AnimationAction}>({});
//   const [previousAction, setPreviousAction] = useState<AnimationAction | null>(null);
//   const [currentAction, setCurrentAction] = useState<AnimationAction | null>(null);
//   const { camera } = useThree();

  const loadVRM = (url: string): void => {
    console.log('loadVRM');

    loader.register((parser) => {
        return new VRMLoaderPlugin(parser, {
            autoUpdateHumanBones: true,
        });
    });
    loader.load(url, (gltf:any) => {
        //   VRM.from(gltf).then((vrm:any) => setVRM(vrm));
        const vrm = gltf.userData.vrm;
        console.log(vrm);
        VRMUtils.rotateVRM0(vrm) // 正面を向かせる
        setVRM(vrm);
        const mixer = new AnimationMixer(gltf.userData.vrm.scene);
        mixer.timeScale = 1.0;
        setMixer(mixer);
        ['Idle', 'ArmStretching', 'Bored', 'Typing'].forEach((name) => {
            loadMixamoAnimation(name, `/animations/${name}.fbx`, vrm).then(clip => {
                if (!mixer) return;
    
                const action = mixer.clipAction(clip);
                actions[name] = action;
                // setActions((prev) => {return {...prev, idle: action}});
                if (name === 'Idle')
                    fadeToAction('Idle', 0.5);
            });    
        });
    });
  };

  const fadeToAction = (actionName: string, duration: number, vrm?: VRM | null) => {
    // if (previousAction === actions[actionName]) return;
    previousAction = currentAction;
    currentAction = actions[actionName];

    if (previousAction && previousAction !== currentAction) {
        console.log("fadeout");
        previousAction.fadeOut(duration);
    }

    if (!currentAction) {
        console.log(`not found ${actionName}`);
        console.log('%o', actions);
        return;
    }

    if (actionName === 'Idle' && vrm) {
        clearExpression(vrm);
        vrm.expressionManager?.setValue("relaxed", 0.5);
    }
    if (actionName === 'ArmStretching' && vrm) {
        clearExpression(vrm);
        vrm.expressionManager?.setValue("relaxed", 1);
    }
    if (actionName === 'Bored' && vrm) {
        clearExpression(vrm);
        vrm.expressionManager?.setValue("happy", 1);
    }

    if (previousAction === currentAction) {
        console.log('nothing');
        return;
    }

    if (actionName === 'Typing' && vrm) {
        // VRMUtils.rotateVRM0(vrm);
        // vrm?.scene.rotateY(0.3 * Math.PI)
        vrm?.scene.position.setY(0.4);
        // vrm?.scene.position.setX(0.4)
        // vrm?.scene.position.setZ(1.1)
    }
    else if (vrm) {
        // VRMUtils.rotateVRM0(vrm);
        vrm?.scene.position.setY(0);
    }

    currentAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
    console.log('play');
  };

  const setExpression = (name: VRMExpressionPresetName, weight: number, vrm: VRM) => {
    clearExpression(vrm);
    vrm.expressionManager?.setValue(name, weight);
  };
  const clearExpression = (vrm: VRM) => {
    vrm.expressionManager?.setValue("happy", 0);
    vrm.expressionManager?.setValue("angry", 0);
    vrm.expressionManager?.setValue("sad", 0);
    vrm.expressionManager?.setValue("relaxed", 0);
  };

  return {vrm, loadVRM, fadeToAction, mixer, setExpression, clearExpression};
};

export { useVRM };