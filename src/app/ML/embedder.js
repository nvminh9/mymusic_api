// Singleton model loader
let embedder = null;
let dim = 384; // kích thước vector của model

export async function initEmbedder() {
    // Use pipline in @xenova/transformers with Dynamic import
    const { pipeline } = await import("@xenova/transformers");
    // 
    if(!embedder){
        // model all-MiniLM-L6-v2
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'); // Dùng cho text
        // Load CLIP model (dùng base patch32 nhẹ hơn (có thể đổi sang large patch14 nếu mạnh))
        // embedder = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32'); // Dùng cho text, image
        // Warm-up 1 câu
        await getEmbedding('hello world');
    }
    return embedder;
}

export async function getEmbedding(text) {
    if(!embedder){
        await initEmbedder();
    }
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    const arr = Array.from(output.data);
    // Normalize để cosine distance chính xác (nếu model chưa normalize)
    const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
    return arr.map(v => v / norm);
}

export function getEmbeddingDim() {
    return dim;
}