import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: ['@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  devServer: {
    port: Number(process.env.NUXT_PORT) || 3000,
    host: '0.0.0.0',
  },
})
