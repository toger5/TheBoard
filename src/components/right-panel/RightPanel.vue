<template>
  <div id="scroll">
      <div v-for="user in members" :key='user' class='user-container'>
        <div class='pb'><img v-bind:src="user.avatar_url" :alt="user.display_name[0].toUpperCase()" height="30" /></div> <div class='user-name-label'>{{ user.display_name }}</div>
      </div>
  </div>
</template>
<script>
export default {
  props: ['members'],
  data() {
    return {
      counter: 100,
      // users: [
      //   {
      //     name: "zebra",
      //   },
      //   {
      //     name: "afffe",
      //   },
      //   {
      //     name: "hans",
      //   },
      // ],
    };
  },
  mounted() {
    setInterval(() => {
      this.counter++;
    }, 1000);
  },
};
</script>
<style scoped>
p {
  background-color: pink;
}
#scroll {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
}
.pb{
  text-align: center;
  color: white;
  padding: auto;
  font-size:21px;
  flex-shrink: 0;
  margin:3px;
  width: 30;
  height: 30;
  background-color: purple;
  border-radius: 50%;
  overflow:hidden;
}
.user-container{
  display: flex;
}
.user-name-label{
  margin: auto;
  /* text-align: center; */
}
</style>