import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    // Iconify ikonkalari build vaqtida SVG sifatida qo'shiladi —
    // ishlash paytida tarmoqqa murojaat qilinmaydi (oflaynda ham ishlaydi)
    Icons({ compiler: 'vue3', autoInstall: false }),
    // Brend markazlashtirish: index.html'dagi %VITE_BRAND_NAME%
    // build vaqtida env'dagi qiymat bilan to'ldiriladi. Boshqa markazga
    // sotishda faqat VITE_BRAND_NAME o'zgartiriladi.
    {
      name: 'brand-placeholder',
      transformIndexHtml(html) {
        const name = process.env.VITE_BRAND_NAME || 'ITLINE'
        return html.replaceAll('%VITE_BRAND_NAME%', name)
      },
      // public/ fayllar (manifest, sw.js) ham shu tarzda yangilanadi
      closeBundle() {
        const name = process.env.VITE_BRAND_NAME || 'ITLINE'
        for (const f of ['manifest.webmanifest', 'sw.js']) {
          const p = `dist/${f}`
          if (fs.existsSync(p)) {
            fs.writeFileSync(
              p,
              fs.readFileSync(p, 'utf8').replaceAll('%VITE_BRAND_NAME%', name)
            )
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
