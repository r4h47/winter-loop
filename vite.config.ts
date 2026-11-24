import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Writes a service worker that caches every built file, so the site opens without signal. */
function offline(): Plugin {
  let out = 'dist'
  return {
    name: 'offline',
    apply: 'build',
    configResolved(c) {
      out = c.build.outDir
    },
    closeBundle() {
      const skip = /\.map$|sw\.js$|silk-road-2400|cyrillic|greek|vietnamese/
      const files = fs.readdirSync(out, { recursive: true, withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => path.relative(out, path.join(f.parentPath, f.name)).replaceAll('\\', '/'))
        .filter((f) => !skip.test(f))
      const hash = createHash('sha256')
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(out, f)))
      const version = `winter-loop-${hash.digest('hex').slice(0, 10)}`
      fs.writeFileSync(path.join(out, 'sw.js'), `const V=${JSON.stringify(version)};const FILES=${JSON.stringify(['./', ...files])};
self.addEventListener('install',(e)=>e.waitUntil(caches.open(V).then((c)=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',(e)=>e.waitUntil(caches.keys().then((k)=>Promise.all(k.filter((x)=>x.startsWith('winter-loop-')&&x!==V).map((x)=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',(e)=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./',{ignoreSearch:true,ignoreVary:true})));return}
e.respondWith(caches.match(e.request,{ignoreSearch:true,ignoreVary:true}).then((r)=>r||fetch(e.request).catch(()=>/silk-road-/.test(u.pathname)?caches.match(new URL('photos/silk-road-1600.webp',self.registration.scope),{ignoreVary:true}):Response.error())))});
`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/winter-loop/' : '/',
  plugins: [react(), offline()],
}))
