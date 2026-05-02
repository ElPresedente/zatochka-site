<script setup lang="ts">
useHead({ title: 'Острый край — Услуги и цены' })

const { data } = await useFetch('/api/services')
const categories = computed(() => data.value?.categories ?? [])
const notes = computed(() => data.value?.notes ?? [])
</script>

<template>
  <main class="flex-1 max-w-[1100px] mx-auto px-10 py-16 w-full">
    <div class="text-center mb-[60px]">
      <span class="section-title text-[52px]">Услуги и цены</span>
    </div>

    <!-- Price tables -->
    <section
      v-for="category in categories"
      :key="category.id"
      class="mb-14"
    >
      <div class="text-center mb-7">
        <span class="text-[44px] font-bold relative inline-block pb-2.5">
          {{ category.title }}
          <span class="absolute bottom-0 left-0 right-0 h-[5px] bg-brand rounded-sm block" />
        </span>
      </div>
      <div class="bg-white rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
        <div
          v-for="(item, i) in category.items"
          :key="item.id"
          class="flex justify-between items-center px-8 py-4 group transition-colors duration-150"
          :class="[
            i < category.items.length - 1 ? 'border-b border-[rgb(232,232,232)]' : '',
            i % 2 === 0 ? 'bg-white' : 'bg-brand/[0.03]',
            'hover:bg-brand/[0.08]',
          ]"
        >
          <span class="text-xl text-[#222] leading-snug">{{ item.name }}</span>
          <span class="text-[22px] font-bold text-brand whitespace-nowrap ml-6">{{ item.price }}</span>
        </div>
      </div>
    </section>

    <!-- Notes -->
    <section class="bg-dark text-white rounded-2xl px-10 py-9 mt-4">
      <div class="text-[30px] font-bold mb-5 text-brand">Дополнительная информация</div>
      <div class="flex flex-col gap-3.5">
        <div
          v-for="note in notes"
          :key="note.id"
          class="flex gap-3 items-start text-lg leading-relaxed"
        >
          <span class="text-brand font-bold text-[22px] mt-0.5">!</span>
          <span>{{ note.content }}</span>
        </div>
      </div>
    </section>
  </main>
</template>
