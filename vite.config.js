import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd());

  return {
    // Vite configuration
    define: {
      // Make environment variables available in the client-side code
      'process.env': {
        OPENAI_API_KEY: env.OPENAI_API_KEY
      },
    },
  };
});
