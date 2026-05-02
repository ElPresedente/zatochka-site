<script setup lang="ts">
useHead({ title: 'Острый край — Галерея' })

const { data: sections } = await useFetch('/api/gallery')

const lightbox = ref<string | null>(null)

const expandedSections = ref<Record<number, boolean>>({})

function toggleSection(id: number) {
  expandedSections.value[id] = !expandedSections.value[id]
}

function visibleImages(section: { id: number; images: { id: number; src: string; label: string }[] }) {
  if (expandedSections.value[section.id]) return section.images
  return section.images.slice(0, 6)
}

function openLightbox(src: string) {
  lightbox.value = src
}

function closeLightbox() {
  lightbox.value = null
}

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox()
  })
})
</script>

<template>
  <main class="flex-1 max-w-[1300px] mx-auto px-10 py-16 w-full">
    <section
      v-for="section in sections"
      :key="section.id"
      class="mb-16"
    >
      <!-- Section label -->
      <div class="mb-8">
        <div
          class="inline-block bg-brand text-white text-[48px] font-medium px-5 leading-snug"
          style="border-radius: 0 120px 0 0"
        >
          {{ section.title }}
        </div>
        <div class="h-[5px] bg-brand rounded-sm" />
      </div>

      <!-- Grid -->
      <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
        <div
          v-for="image in visibleImages(section)"
          :key="image.id"
          class="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(0,0,0,0.18)] bg-center bg-cover bg-[rgb(220,220,220)]"
          :style="image.src ? `background-image: url('${image.src}')` : ''"
          :title="image.label"
          @click="openLightbox(image.src)"
        />
      </div>

      <!-- Show more -->
      <div v-if="section.images.length > 6" class="text-center mt-7">
        <button
          class="btn-primary text-xl"
          @click="toggleSection(section.id)"
        >
          {{ expandedSections[section.id] ? 'Свернуть' : 'Показать больше' }}
        </button>
      </div>
    </section>
  </main>

  <!-- Lightbox -->
  <Teleport to="body">
    <div
      v-if="lightbox"
      class="fixed inset-0 bg-black/85 flex items-center justify-center z-[999] cursor-zoom-out"
      @click="closeLightbox"
    >
      <img
        :src="lightbox"
        alt="Увеличенное фото"
        class="max-w-[90vw] max-h-[90vh] rounded-lg shadow-[0_8px_64px_rgba(0,0,0,0.5)]"
        @click.stop
      />
      <button
        class="fixed top-6 right-8 bg-white/15 border-2 border-white/40 text-white w-11 h-11 rounded-full text-2xl cursor-pointer flex items-center justify-center"
        @click="closeLightbox"
      >
        ×
      </button>
    </div>
  </Teleport>
</template>
