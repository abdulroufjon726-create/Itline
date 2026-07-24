<script setup>
import Loading from './components/Loading.vue'
import PwaInstall from './components/PwaInstall.vue'
</script>

<template>
  <div  class="overflow-x-hidden">
    <Suspense>
      <template #default>
        <RouterView />
      </template>
      <template #fallback>
        <div style="min-height:200px;display:flex;align-items:center;justify-content:center">
          <div class="inline-spinner" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(90deg,#06b6d4,#7c3aed);animation:spin 1s linear infinite"></div>
        </div>
      </template>
    </Suspense>
    <Loading />
    <PwaInstall />
  </div>
  
</template>

<style scoped>
@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
</style>

<style scoped></style>
