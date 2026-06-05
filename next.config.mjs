/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => \`build-\${Date.now()}\`,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
