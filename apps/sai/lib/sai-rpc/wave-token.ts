export function getConfiguredDefaultWaveToken() {
  return process.env.NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN?.trim() ?? "";
}
