import { createApp } from 'vue';
import App from './App.vue';
import '../../build/vue-tokens.css';
import referenceCss from 'reference-css';
if (referenceCss) {
    const style = document.createElement('style');
    style.textContent = referenceCss;
    document.head.append(style);
}
createApp(App).mount('#app');
