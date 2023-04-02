// tiktokenのために必要なcracoの設定
//   tiktokenが不要になったら削除して良い
module.exports = {
    webpack: {
        configure: (config) => {
            config.experiments = {
                asyncWebAssembly: true,
                layers: true,
            };

            // turn off static file serving of WASM files
            // we need to let Webpack handle WASM import
            config.module.rules
                .find((i) => "oneOf" in i)
                .oneOf.find((i) => i.type === "asset/resource")
                .exclude.push(/\.wasm$/);
            return config;
        },
    },
};
