<script setup lang="ts">
defineProps<{ orderId: number | null }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl p-6 lg:p-10 max-w-[440px] w-full text-center shadow-2xl">
        <div class="text-5xl lg:text-[64px] mb-3 lg:mb-4">✅</div>
        <div class="text-xl lg:text-[26px] font-bold mb-2 lg:mb-3">Заказ оформлен!</div>
        <p class="text-[#555] text-base lg:text-lg leading-relaxed mb-5 lg:mb-6">
          Заказ №{{ orderId }} сохранен. Мы свяжемся с вами в ближайшее время для подтверждения.
        </p>
        <div class="flex flex-col gap-3">
          <button class="btn-primary px-8 lg:px-10 py-2.5 lg:py-3 text-base lg:text-lg" @click="emit('close')">Закрыть</button>
          <NuxtLink
            to="/account?tab=orders"
            class="text-brand font-semibold text-sm hover:underline no-underline"
            @click="emit('close')"
          >Посмотреть в личном кабинете →</NuxtLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>
