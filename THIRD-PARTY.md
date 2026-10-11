# Third-party notices

AppHub bundles Electron (MIT), Chromium and associated third-party components (see LICENSE.electron.txt and LICENSES.chromium.html beside AppHub.exe), Transformers.js 4.3.1 (Apache-2.0), ONNX Runtime (MIT), and their npm dependencies. Dependency versions are recorded in package-lock.json; their license files accompany their modules in resources/app.asar or resources/app.asar.unpacked.

The local embedding model is Xenova/all-MiniLM-L6-v2, an ONNX conversion/quantization of sentence-transformers/all-MiniLM-L6-v2. Model repository: https://huggingface.co/Xenova/all-MiniLM-L6-v2 at revision 751bff37182d3f1213fa05d7196b954e230abad9. License: Apache License 2.0. The bundled quantized ONNX weights and tokenizer/config files are unmodified downloads. Exact file sizes and SHA256 checksums are recorded in scripts/prepare-model.mjs. The Apache 2.0 license text accompanies the model.

The Windows Package Manager client and installed third-party applications are not redistributed by AppHub. Their own publishers' terms apply to their downloads and installations. Displayed app icons and names are read locally from installed software.

Qwen3-4B-GGUF Q4_K_M is bundled unmodified from https://huggingface.co/Qwen/Qwen3-4B-GGUF at revision bc640142c66e1fdd12af0bd68f40445458f3869b (Apache-2.0). Model SHA256: 7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5. Its license accompanies models/Qwen.

llama.cpp CPU runtime b11552 is bundled from https://github.com/ggml-org/llama.cpp/releases/tag/b11552 (MIT); LICENSE and the LLVM OpenMP notice accompany runtime. The official Windows CPU archive SHA256 is c00741179811ff903b515eae28bdeef1f47af6e81c49920c4e68b62954e056d6. Only the inference server and necessary DLLs are redistributed.
