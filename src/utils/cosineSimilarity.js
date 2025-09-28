/**
 * Tính cosine similarity giữa 2 vector
 * @param {number[]} vecA - vector A
 * @param {number[]} vecB - vector B
 * @returns {number} similarity score từ -1 đến 1
 */
export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    throw new Error("Input vectors must be arrays");
  }
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0; // tránh chia cho 0

  return dotProduct / (normA * normB);
}
