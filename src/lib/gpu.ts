let cached: boolean | null = null;

const WEAK = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen|intel.*(gma|hd graphics( [2-5]\d{3})?$)|mali-[t4]|adreno.*\b[1-4]\d{2}\b|powervr sgx/i;

export const isWeakGpu = (): boolean => {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      cached = true;
      return cached;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    cached = WEAK.test(renderer.trim());
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = true;
  }
  return cached;
};
