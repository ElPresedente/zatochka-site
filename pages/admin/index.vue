<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Дашборд' })

const { data: stats } = await useFetch('/api/admin/stats')
</script>

<template>
  <div class="overflow-y-auto flex-1 p-8">
    <h1 class="text-2xl font-bold mb-8 text-[#222]">Дашборд</h1>

    <div class="grid grid-cols-4 gap-5 mb-10">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-[#eee]">
        <div class="text-[40px] font-bold text-brand">{{ stats?.products.total ?? '—' }}</div>
        <div class="text-sm text-[#888] mt-1">Товаров всего</div>
        <div class="text-xs text-[#aaa] mt-0.5">{{ stats?.products.active ?? '—' }} активных</div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-[#eee]">
        <div class="text-[40px] font-bold text-brand">{{ stats?.orders.total ?? '—' }}</div>
        <div class="text-sm text-[#888] mt-1">Заказов всего</div>
        <div class="text-xs text-[#aaa] mt-0.5">{{ stats?.orders.created ?? '—' }} созданных</div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-[#eee]">
        <div class="text-[40px] font-bold text-brand">{{ stats?.services.items ?? '—' }}</div>
        <div class="text-sm text-[#888] mt-1">Позиций прайса</div>
        <div class="text-xs text-[#aaa] mt-0.5">в {{ stats?.services.categories ?? '—' }} категориях</div>
      </div>
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-[#eee]">
        <div class="text-[40px] font-bold text-brand">{{ stats?.workers ?? '—' }}</div>
        <div class="text-sm text-[#888] mt-1">Работников</div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-5">
      <NuxtLink
        v-for="link in [
          { to: '/admin/orders', label: 'Обработка заказов', desc: 'Новые, принятые и завершенные заказы магазина', icon: '📋' },
          { to: '/admin/products', label: 'Управление товарами', desc: 'Добавить, изменить, удалить товары в магазине', icon: '🛒' },
          { to: '/admin/gallery', label: 'Галерея', desc: 'Разделы и фотографии галереи', icon: '🖼️' },
        ]"
        :key="link.to"
        :to="link.to"
        class="bg-white rounded-2xl p-6 shadow-sm border border-[#eee] hover:border-brand hover:shadow-md transition-all no-underline group"
      >
        <div class="text-3xl mb-3">{{ link.icon }}</div>
        <div class="text-base font-bold text-[#222] group-hover:text-brand transition-colors">{{ link.label }}</div>
        <div class="text-sm text-[#888] mt-1 leading-relaxed">{{ link.desc }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
