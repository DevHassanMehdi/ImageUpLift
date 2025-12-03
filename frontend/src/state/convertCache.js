const defaultSettings = {
  outputType: 'vectorize',
  hierarchical: 'stacked',
  filterSpeckle: 8,
  colorPrecision: 6,
  gradientStep: 60,
  preset: '',
  mode: 'spline',
  cornerThreshold: 40,
  segmentLength: 10,
  spliceThreshold: 80,
};

const initialState = {
  file: null,
  originalSrc: '',
  vectorSrc: '',
  metadata: null,
  recommendation: null,
  outlineLow: 100,
  outlineHigh: 200,
  loadedConversionId: null,
  settings: { ...defaultSettings },
  hasAnalyzed: false,
  isConverting: false,
};

let cache = { ...initialState, settings: { ...defaultSettings } };

export const getConvertCache = () => ({
  ...cache,
  settings: { ...cache.settings },
});

export const updateConvertCache = (partial) => {
  cache = {
    ...cache,
    ...partial,
  };
  if (partial?.settings) {
    cache.settings = { ...partial.settings };
  }
};

export const resetConvertCache = () => {
  cache = {
    ...initialState,
    settings: { ...defaultSettings },
  };
};

export const getDefaultSettings = () => ({ ...defaultSettings });
