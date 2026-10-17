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
         courier-prime/files/courier-prime-latin-700-normal bangers/files/bangers-latin-400-normal \
         pacifico/files/pacifico-latin-400-normal oswald/files/oswald-latin-700-normal lilita-one/files/lilita-one-latin-400-normal; do
  cp "$NM/@fontsource/$f.woff2" www/fonts/
done
# recorte de pessoa e detector de rosto (MediaPipe, Apache 2.0), funcionam sem internet
mkdir -p www/vendor/mpseg www/vendor/mpface
for d in selfie_segmentation:mpseg face_detection:mpface; do
  find "$NM/@mediapipe/${d%%:*}" -maxdepth 1 -type f \( -name '*.js' -o -name '*.wasm' -o -name '*.data' -o -name '*.binarypb' -o -name '*.tflite' \) -exec cp {} "www/vendor/${d##*:}/" \;
done
echo "Bibliotecas prontas."
