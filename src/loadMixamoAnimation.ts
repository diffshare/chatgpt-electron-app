import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { AnimationClip, KeyframeTrack, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from "three";
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

export function loadMixamoAnimation(name: string, url: string, vrm: VRM) {
    const loader = new FBXLoader();
    return loader.loadAsync(url).then(asset => {
        const clip = AnimationClip.findByName(asset.animations, 'mixamo.com'); // AnimationClipを抽出する
        const tracks: KeyframeTrack[] = []; // VRM用のKeyframeTrackをこの配列に格納する

        // https://github.com/jphacks/A_2207/blob/master/src/components/vrm/loadMixamoAnimation.js#L11
        const restRotationInverse = new Quaternion()
        const parentRestWorldRotation = new Quaternion()
        const _quatA = new Quaternion()
        const _vec3 = new Vector3()
    
        // Adjust with reference to hips height.
        const motionHipsHeight =
          asset.getObjectByName('mixamorigHips')?.position.y || 0
        const vrmHipsY =
          vrm.humanoid?.getNormalizedBoneNode('hips')?.getWorldPosition(_vec3).y ||
          0
        const vrmRootY = vrm.scene.getWorldPosition(_vec3).y
        const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY)
        const hipsPositionScale = vrmHipsHeight / motionHipsHeight


        clip.tracks.forEach(track => {
            const trackSplitted = track.name.split('.');
            const mixamoRigName = trackSplitted[0];
            const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
            const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
            const mixamoRigNode = asset.getObjectByName(mixamoRigName);
            
            if (!vrmNodeName) return;

            const propertyName = trackSplitted[1];

            mixamoRigNode?.getWorldQuaternion(restRotationInverse).invert()
            mixamoRigNode?.parent?.getWorldQuaternion(parentRestWorldRotation)

            if ( track instanceof QuaternionKeyframeTrack ) {

              // Retarget rotation of mixamoRig to NormalizedBone.
              for (let i = 0; i < track.values.length; i += 4) {
                const flatQuaternion = track.values.slice(i, i + 4)

                _quatA.fromArray(flatQuaternion)

                // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
                _quatA
                  .premultiply(parentRestWorldRotation)
                  .multiply(restRotationInverse)

                _quatA.toArray(flatQuaternion)

                flatQuaternion.forEach((v, index) => {
                  track.values[index + i] = v
                })
              }

              tracks.push(
                new QuaternionKeyframeTrack(
                  `${vrmNodeName}.${propertyName}`,
                  track.times,
                  track.values.map((v, i) =>
                    vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v,
                  ),
                ),
              )

                // tracks.push( new QuaternionKeyframeTrack(
                //   `${ vrmNodeName }.${ propertyName }`,
                //   track.times,
                //   track.values.map( ( v, i ) => (
                //     ( vrm.meta?.metaVersion === '0' && ( i % 2 ) === 0 ) ? -v : v
                //   ) ),
                // ) );
              } else if ( track instanceof VectorKeyframeTrack ) {
                tracks.push( new VectorKeyframeTrack(
                  `${ vrmNodeName }.${ propertyName }`,
                  track.times,
                  track.values.map( ( v, i ) => (
                    ( ( vrm.meta?.metaVersion === '0' && ( i % 3 ) !== 1 ) ? -v : v ) * 0.01
                  ) ),
                ));
              }
        });
        console.log(tracks);
        return new AnimationClip(name, clip.duration, tracks)
    });
}

type RigMap = {
    [key: string]: VRMHumanBoneName;
};
const mixamoVRMRigMap: RigMap = {
    mixamorigHips: 'hips',
    mixamorigSpine: 'spine',
    mixamorigSpine1: 'chest',
    mixamorigSpine2: 'upperChest',
    mixamorigNeck: 'neck',
    mixamorigHead: 'head',
    mixamorigLeftShoulder: 'leftShoulder',
    mixamorigLeftArm: 'leftUpperArm',
    mixamorigLeftForeArm: 'leftLowerArm',
    mixamorigLeftHand: 'leftHand',
    mixamorigLeftHandThumb1: 'leftThumbProximal',
    // mixamorigLeftHandThumb2: 'leftThumbIntermediate',
    mixamorigLeftHandThumb3: 'leftThumbDistal',
    mixamorigLeftHandIndex1: 'leftIndexProximal',
    mixamorigLeftHandIndex2: 'leftIndexIntermediate',
    mixamorigLeftHandIndex3: 'leftIndexDistal',
    mixamorigLeftHandMiddle1: 'leftMiddleProximal',
    mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
    mixamorigLeftHandMiddle3: 'leftMiddleDistal',
    mixamorigLeftHandRing1: 'leftRingProximal',
    mixamorigLeftHandRing2: 'leftRingIntermediate',
    mixamorigLeftHandRing3: 'leftRingDistal',
    mixamorigLeftHandPinky1: 'leftLittleProximal',
    mixamorigLeftHandPinky2: 'leftLittleIntermediate',
    mixamorigLeftHandPinky3: 'leftLittleDistal',
    mixamorigRightShoulder: 'rightShoulder',
    mixamorigRightArm: 'rightUpperArm',
    mixamorigRightForeArm: 'rightLowerArm',
    mixamorigRightHand: 'rightHand',
    mixamorigRightHandPinky1: 'rightLittleProximal',
    mixamorigRightHandPinky2: 'rightLittleIntermediate',
    mixamorigRightHandPinky3: 'rightLittleDistal',
    mixamorigRightHandRing1: 'rightRingProximal',
    mixamorigRightHandRing2: 'rightRingIntermediate',
    mixamorigRightHandRing3: 'rightRingDistal',
    mixamorigRightHandMiddle1: 'rightMiddleProximal',
    mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
    mixamorigRightHandMiddle3: 'rightMiddleDistal',
    mixamorigRightHandIndex1: 'rightIndexProximal',
    mixamorigRightHandIndex2: 'rightIndexIntermediate',
    mixamorigRightHandIndex3: 'rightIndexDistal',
    mixamorigRightHandThumb1: 'rightThumbProximal',
    // mixamorigRightHandThumb2: 'rightThumbIntermediate',
    mixamorigRightHandThumb3: 'rightThumbDistal',
    mixamorigLeftUpLeg: 'leftUpperLeg',
    mixamorigLeftLeg: 'leftLowerLeg',
    mixamorigLeftFoot: 'leftFoot',
    mixamorigLeftToeBase: 'leftToes',
    mixamorigRightUpLeg: 'rightUpperLeg',
    mixamorigRightLeg: 'rightLowerLeg',
    mixamorigRightFoot: 'rightFoot',
    mixamorigRightToeBase: 'rightToes',
};
