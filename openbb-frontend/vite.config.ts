import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'localhost',
      'ec2-100-26-54-124.compute-1.amazonaws.com',
      '.compute-1.amazonaws.com', // Allow all EC2 hosts
      '.amazonaws.com' // Allow all AWS hosts
    ]
  }
})
