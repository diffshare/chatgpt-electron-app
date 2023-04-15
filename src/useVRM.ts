import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { useEffect, useRef, useState } from "react";
import { useThree } from "react-three-fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const useVRM = (): [VRM | null, (_: string) => void] => {
  const { current: loader } = useRef(new GLTFLoader());
  const [vrm, setVRM] = useState<VRM | null>(null);
//   const { camera } = useThree();

  useEffect(() => {
    // if (vrm && vrm.lookAt) vrm.lookAt.target = camera;
  });

  const loadVRM = (url: string): void => {
    console.log('loadVRM');

    loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
    });
    loader.load(url, (gltf:any) => {
        //   VRM.from(gltf).then((vrm:any) => setVRM(vrm));
        const vrm = gltf.userData.vrm;
        console.log(vrm);
        setVRM(vrm);
    });
  };

  return [vrm, loadVRM];
};

export { useVRM };