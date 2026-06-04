const { loadEnvConfig } = require('@next/env')

// Load env vars from the parent directory where Vercel stores them
loadEnvConfig('/vercel/share')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
