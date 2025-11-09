/**
 * Math utilities for PCA, vector operations, and scoring
 */
import { Matrix, EigenvalueDecomposition } from 'ml-matrix';
import type { SpotifyAudioFeatures } from '../src/types';

/**
 * Normalize a feature vector to [0, 1] range
 */
export function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return values.map(() => 0.5);

  return values.map((v) => (v - min) / range);
}

/**
 * Compute mean of an array
 */
export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute standard deviation
 */
export function std(values: number[]): number {
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Standardize features (zero mean, unit variance)
 */
export function standardize(matrix: number[][]): {
  data: number[][];
  means: number[];
  stds: number[];
} {
  const numFeatures = matrix[0].length;
  const means: number[] = [];
  const stds: number[] = [];

  // Compute means and stds for each feature
  for (let i = 0; i < numFeatures; i++) {
    const column = matrix.map((row) => row[i]);
    means.push(mean(column));
    stds.push(std(column));
  }

  // Standardize
  const standardized = matrix.map((row) =>
    row.map((val, i) => {
      const s = stds[i];
      return s === 0 ? 0 : (val - means[i]) / s;
    })
  );

  return { data: standardized, means, stds };
}

/**
 * Principal Component Analysis (PCA)
 */
export function pca(data: number[][], numComponents: number = 8): {
  components: number[][];
  transformedData: number[][];
  explainedVariance: number[];
} {
  // Standardize the data
  const { data: standardizedData } = standardize(data);

  // Create matrix
  const matrix = new Matrix(standardizedData);

  // Compute covariance matrix
  const transposed = matrix.transpose();
  const covariance = transposed.mmul(matrix).div(matrix.rows - 1);

  // Compute eigenvalues and eigenvectors
  const evd = new EigenvalueDecomposition(covariance);
  const eigenvalues = evd.realEigenvalues;
  const eigenvectors = evd.eigenvectorMatrix;

  // Sort by eigenvalue (descending)
  const indices = eigenvalues
    .map((val, idx) => ({ val, idx }))
    .sort((a, b) => b.val - a.val)
    .map((item) => item.idx);

  // Select top components
  const topComponents: number[][] = [];
  for (let i = 0; i < Math.min(numComponents, indices.length); i++) {
    const idx = indices[i];
    topComponents.push(eigenvectors.getColumn(idx));
  }

  // Transform data
  const componentMatrix = new Matrix(topComponents).transpose();
  const transformed = matrix.mmul(componentMatrix);

  // Compute explained variance
  const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
  const explainedVariance = indices
    .slice(0, numComponents)
    .map((idx) => eigenvalues[idx] / totalVariance);

  return {
    components: topComponents,
    transformedData: transformed.to2DArray(),
    explainedVariance,
  };
}

/**
 * Compute centroid (mean) of vectors
 */
export function computeCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];

  const numDims = vectors[0].length;
  const centroid: number[] = new Array(numDims).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < numDims; i++) {
      centroid[i] += vector[i];
    }
  }

  return centroid.map((sum) => sum / vectors.length);
}

/**
 * Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }

  return Math.sqrt(sum);
}

/**
 * Cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Convert Spotify audio features to feature vector
 */
export function audioFeaturesToVector(
  features: SpotifyAudioFeatures
): number[] {
  return [
    features.danceability,
    features.energy,
    features.speechiness,
    features.acousticness,
    features.instrumentalness,
    features.liveness,
    features.valence,
    features.tempo / 200, // Normalize tempo (typically 0-200 BPM)
    features.loudness / -60, // Normalize loudness (typically -60 to 0 dB)
  ];
}

/**
 * Compute audio feature ranges (min/max for each feature)
 */
export function computeFeatureRanges(
  features: SpotifyAudioFeatures[]
): {
  valence: [number, number];
  energy: [number, number];
  acousticness: [number, number];
  tempo: [number, number];
  instrumentalness: [number, number];
  danceability: [number, number];
} {
  const valences = features.map((f) => f.valence);
  const energies = features.map((f) => f.energy);
  const acousticnesses = features.map((f) => f.acousticness);
  const tempos = features.map((f) => f.tempo);
  const instrumentalnesses = features.map((f) => f.instrumentalness);
  const danceabilities = features.map((f) => f.danceability);

  return {
    valence: [Math.min(...valences), Math.max(...valences)],
    energy: [Math.min(...energies), Math.max(...energies)],
    acousticness: [Math.min(...acousticnesses), Math.max(...acousticnesses)],
    tempo: [Math.min(...tempos), Math.max(...tempos)],
    instrumentalness: [
      Math.min(...instrumentalnesses),
      Math.max(...instrumentalnesses),
    ],
    danceability: [Math.min(...danceabilities), Math.max(...danceabilities)],
  };
}

/**
 * Infer style description from audio features (for embedding)
 */
export function inferStyle(features: SpotifyAudioFeatures): string {
  const styles: string[] = [];

  // Energy & Valence combination
  if (features.energy > 0.7 && features.valence > 0.6) {
    styles.push('upbeat');
  } else if (features.energy < 0.4 && features.valence < 0.4) {
    styles.push('melancholic');
  } else if (features.energy > 0.6 && features.valence < 0.4) {
    styles.push('intense');
  } else if (features.energy < 0.5 && features.valence > 0.5) {
    styles.push('calm-warm');
  }

  // Acousticness
  if (features.acousticness > 0.7) {
    styles.push('acoustic');
  } else if (features.acousticness < 0.3) {
    styles.push('electronic');
  }

  // Instrumentalness
  if (features.instrumentalness > 0.5) {
    styles.push('instrumental');
  }

  // Tempo
  if (features.tempo < 80) {
    styles.push('slow');
  } else if (features.tempo > 140) {
    styles.push('fast');
  } else {
    styles.push('mid-tempo');
  }

  // Danceability
  if (features.danceability > 0.7) {
    styles.push('groovy');
  }

  return styles.join(', ');
}
