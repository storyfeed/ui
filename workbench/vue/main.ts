import { createApp } from 'vue';
import App from './App.vue';
import Shipment from './Shipment.vue';
import { feedBodies } from '../../resources/js/vue/body';
import '../../build/vue-tokens.css';
import referenceCss from 'reference-css';
if (referenceCss) {
    const style = document.createElement('style');
    style.textContent = referenceCss;
    document.head.append(style);
}
createApp(App).use(feedBodies({ 'Acme/Shipment': Shipment })).mount('#app');
