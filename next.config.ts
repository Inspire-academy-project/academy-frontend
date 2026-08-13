import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 모든 화면이 브라우저에서 그려지고 데이터는 API 서버에서 가져오므로
  // 정적 파일로 내보낸다. 서버가 필요 없어 어떤 정적 호스팅에도 올릴 수 있다.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
