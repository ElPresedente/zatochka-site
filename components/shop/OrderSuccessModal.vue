<script setup lang="ts">
defineProps<{ orderId: number | null }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl p-10 max-w-[440px] w-full text-center shadow-2xl">
        <div class="text-[64px] mb-4">✅</div>
        <div class="text-[26px] font-bold mb-3">Заказ оформлен!</div>
        <p class="text-[#555] text-lg leading-relaxed mb-6">
          Заказ №{{ orderId }} сохранен. Мы свяжемся с вами в ближайшее время для подтверждения.
        </p>
        <button class="btn-primary px-10 py-3 text-lg" @click="emit('close')">Закрыть</button>
      </div>
    </div>
  </Teleport>
</template>
