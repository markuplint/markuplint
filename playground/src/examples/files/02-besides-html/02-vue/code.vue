<template>
  <p :id="id"></p>
  <ul id="hard-coded">
    <li v-for="item in list" :key="item.key">{{ item.text }}</li>
  </ul>
</template>

<script>
  import { defineComponent } from 'vue';
  export default defineComponent({
    props: {
      id: {
        type: String,
        required: true,
      },
      list: {
        type: Array,
        required: true,
      }
    },
  });
</script>