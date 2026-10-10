// The workbench supplies the same app icon mapping to both kits.
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Activity, FileUp, CircleCheck, Image, UserPlus } from 'lucide-vue-next';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('build',{recursive:true});
const icons=Object.fromEntries(await Promise.all(Object.entries({'activity':Activity,'file-up':FileUp,'circle-check':CircleCheck,'user-plus':UserPlus,'image':Image}).map(async([name,icon])=>[name,await renderToString(createSSRApp({render:()=>h(icon)}))])));
await writeFile('build/workbench-icons.json',JSON.stringify(icons));
