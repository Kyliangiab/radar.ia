/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Le lint est un step CI séparé (non bloquant, T11) — on ne le fait PAS
  // tourner pendant `next build` pour ne pas bloquer le déploiement Vercel sur
  // du style (dette : ~10 no-unescaped-entities à nettoyer). Le typecheck, lui,
  // reste actif au build.
  eslint: { ignoreDuringBuilds: true },
  // On n'embarque pas le runtime ML dans le bundle serveur (onnxruntime natif)
  experimental: {
    serverComponentsExternalPackages: [
      "@huggingface/transformers",
      "onnxruntime-node",
      "sharp",
    ],
  },
};

export default nextConfig;
