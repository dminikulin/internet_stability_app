<template>
  <div class="loader"></div>
</template>

<style scoped lang="css">
/** Animation "The Progress #7" from https://css-loaders.com/ */

.loader {
  width: 120px;
  height: 24px;
  mask:
    radial-gradient(circle closest-side, #000 94%, #0000) 0 0/25% 100%,
    linear-gradient(#000 0 0) center/calc(100% - 12px) calc(100% - 12px)
      no-repeat;
  -webkit-mask:
    radial-gradient(circle closest-side, #000 94%, #0000) 0 0/25% 100%,
    linear-gradient(#000 0 0) center/calc(100% - 12px) calc(100% - 12px)
      no-repeat;
  /* Color copied from Tailwind */
  background: linear-gradient(#00d492 0 0) 0/0% no-repeat #ddd;
  animation: l7 2s infinite linear;
}
@keyframes l7 {
  100% {
    background-size: 100%;
  }
}
</style>
