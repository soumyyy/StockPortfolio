/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/StockPortfolio',
  assetPrefix: '/StockPortfolio/',
  trailingSlash: true
}

module.exports = nextConfig