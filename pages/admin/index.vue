<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Дашборд' })

const { data: stats } = await useFetch('/api/admin/stats')
</script>

<template>
  <div class="overflow-y-auto flex-1 p-4 lg:p-8">
    <h1 class="text-xl lg:text-2xl font-bold mb-5 lg:mb-8 text-[#222]">Дашборд</h1>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-10">
      <NuxtLink to="/admin/products" class="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-[#eee] hover:border-brand hover:shadow-md transition-all no-underline block">
        <div class="text-3xl lg:text-[40px] font-bold text-brand">{{ stats?.products.total ?? '—' }}</div>
        <div class="text-xs lg:text-sm text-[#888] mt-1">Товаров всего</div>
        <div class="text-[11px] lg:text-xs text-[#aaa] mt-0.5">{{ stats?.products.active ?? '—' }} активных</div>
      </NuxtLink>
      <NuxtLink
        to="/admin/orders"
        class="rounded-2xl p-4 lg:p-6 shadow-sm border transition-all no-underline block hover:shadow-md"
        :class="stats?.orders.created ? 'bg-orange-50 border-orange-300 hover:border-orange-400' : 'bg-white border-[#eee] hover:border-brand'"
      >
        <div class="text-3xl lg:text-[40px] font-bold text-brand">{{ stats?.orders.total ?? '—' }}</div>
        <div class="text-xs lg:text-sm text-[#888] mt-1">Заказов всего</div>
        <div
          class="text-[11px] lg:text-xs font-semibold mt-0.5"
          :class="stats?.orders.created ? 'text-orange-500' : 'text-[#aaa]'"
        >
          <template v-if="stats?.orders.created">
            {{ stats.orders.created }} {{ stats.orders.created === 1 ? 'новый заказ' : stats.orders.created < 5 ? 'новых заказа' : 'новых заказов' }} ⚡
          </template>
          <template v-else>нет новых</template>
        </div>
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
      <NuxtLink
        v-for="link in [
          { to: '/admin/orders', label: 'Обработка заказов', desc: 'Новые, принятые и завершенные заказы магазина', icon: '📋' },
          { to: '/admin/products', label: 'Управление товарами', desc: 'Добавить, изменить, удалить товары в магазине', icon: '🛒' },
          { to: '/admin/gallery', label: 'Галерея', desc: 'Разделы и фотографии галереи', icon: '🖼️' },
        ]"
        :key="link.to"
        :to="link.to"
        class="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-[#eee] hover:border-brand hover:shadow-md transition-all no-underline group"
      >
        <div class="text-2xl lg:text-3xl mb-2 lg:mb-3">{{ link.icon }}</div>
        <div class="text-base font-bold text-[#222] group-hover:text-brand transition-colors">{{ link.label }}</div>
        <div class="text-sm text-[#888] mt-1 leading-relaxed">{{ link.desc }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
