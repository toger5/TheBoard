import { createApp } from 'vue'
import RightPanel from './RightPanel.vue'

export let rightPanel = createApp({
  data() {
    return {
      members: []
    }
  },
  template: '<RightPanel v-bind:members="members"/>',
  components: { RightPanel },
}).mount('#right-panel')
