#!/usr/bin/env bash
# Baixa as bibliotecas fixadas em package.json e copia para www/vendor e www/fonts.
set -euo pipefail
cd "$(dirname "$0")"
npm ci --ignore-scripts --no-audit --no-fund
NM=node_modules
mkdir -p www/vendor/ort www/fonts
cp $NM/mediabunny/dist/bundles/mediabunny.min.mjs www/vendor/
cp $NM/@huggingface/transformers/dist/transformers.min.js www/vendor/
cp $NM/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm $NM/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs www/vendor/ort/
cp $NM/@svg-maps/brazil/index.js www/vendor/brazil-map.js   # mapa do Brasil, @svg-maps (CC BY 4.0)
for f in poppins/files/poppins-latin-400-normal poppins/files/poppins-latin-600-normal poppins/files/poppins-latin-700-normal \
         poppins/files/poppins-latin-800-normal poppins/files/poppins-latin-900-normal poppins/files/poppins-latin-ext-700-normal \
         poppins/files/poppins-latin-ext-900-normal anton/files/anton-latin-400-normal bebas-neue/files/bebas-neue-latin-400-normal \
         permanent-marker/files/permanent-marker-latin-400-normal montserrat/files/montserrat-latin-900-normal \
         courier-prime/files/courier-prime-latin-700-normal; do
  cp "$NM/@fontsource/$f.woff2" www/fonts/
done
echo "Bibliotecas prontas."
