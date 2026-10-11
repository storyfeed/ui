// The glyphs the README world maps its verbs to, from Lucide, as the Vue and React kits draw them.
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Activity, FileCheck, Image, Ticket, UserPlus } from 'lucide-vue-next';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('build/readme', { recursive: true });
const icons = Object.fromEntries(await Promise.all(Object.entries({ activity: Activity, 'file-check': FileCheck, image: Image, ticket: Ticket, 'user-plus': UserPlus })
    .map(async ([name, icon]) => [name, await renderToString(createSSRApp({ render: () => h(icon) }))])));
await writeFile('build/readme/icons.json', JSON.stringify(icons));
