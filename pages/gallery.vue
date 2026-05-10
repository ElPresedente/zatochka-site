<script setup lang="ts">
useHead({ title: 'Острый край — Галерея' })

interface GalleryImage { id: number; src: string; label: string }
interface GallerySection { id: number; title: string; images: GalleryImage[] }

const { data: sections } = await useFetch<GallerySection[]>('/api/gallery')

const expandedSections = ref<Record<number, boolean>>({})

function toggleSection(id: number) {
  expandedSections.value[id] = !expandedSections.value[id]
}

function visibleImages(section: GallerySection) {
  if (expandedSections.value[section.id]) return section.images
  return section.images.slice(0, 6)
}

// ── Lightbox / slider ─────────────────────────────────────────────────
const lightbox = ref<{ images: GalleryImage[]; index: number } | null>(null)
const currentImage = computed(() =>
  lightbox.value ? lightbox.value.images[lightbox.value.index] : null
)

function openLightbox(images: GalleryImage[], index: number) {
  lightbox.value = { images, index }
}

function closeLightbox() {
  lightbox.value = null
}

function prevImage() {
  if (!lightbox.value) return
  lightbox.value.index = (lightbox.value.index - 1 + lightbox.value.images.length) % lightbox.value.images.length
}

function nextImage() {
  if (!lightbox.value) return
  lightbox.value.index = (lightbox.value.index + 1) % lightbox.value.images.length
}

let touchStartX = 0
function onTouchStart(e: TouchEvent) { touchStartX = e.touches[0].clientX }
function onTouchEnd(e: TouchEvent) {
  const delta = touchStartX - e.changedTouches[0].clientX
  if (Math.abs(delta) > 50) delta > 0 ? nextImage() : prevImage()
}

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (!lightbox.value) return
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') prevImage()
    if (e.key === 'ArrowRight') nextImage()
  })
})
</script>

<template>
  <main class="flex-1 max-w-[1300px] mx-auto px-4 lg:px-10 py-10 lg:py-16 w-full">
    <section
      v-for="section in sections"
      :key="section.id"
      class="mb-12 lg:mb-16"
    >
      <!-- Section label -->
      <div class="mb-6 lg:mb-8">
        <div
          class="inline-block bg-brand text-white text-2xl lg:text-[48px] font-medium px-4 lg:px-5 py-1 lg:py-0 leading-snug"
          style="border-radius: 0 60px 0 0"
        >
          {{ section.title }}
        </div>
        <div class="h-[4px] lg:h-[5px] bg-brand rounded-sm" />
      </div>

      <!-- Grid -->
      <div class="grid gap-3 sm:gap-4 lg:gap-5 grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        <div
          v-for="image in visibleImages(section)"
          :key="image.id"
          class="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(0,0,0,0.18)] bg-center bg-cover bg-[rgb(220,220,220)]"
          :style="image.src ? `background-image: url('${image.src}')` : ''"
          :title="image.label"
          @click="openLightbox(section.images, section.images.indexOf(image))"
        />
      </div>

      <!-- Show more -->
      <div v-if="section.images.length > 6" class="text-center mt-6 lg:mt-7">
        <button
          class="btn-primary text-base lg:text-xl"
          @click="toggleSection(section.id)"
        >
          {{ expandedSections[section.id] ? 'Свернуть' : 'Показать больше' }}
        </button>
      </div>
    </section>
  </main>

  <!-- Lightbox with slider -->
  <Teleport to="body">
    <div
      v-if="lightbox && currentImage"
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-[999]"
      @click.self="closeLightbox"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- Close -->
      <button
        class="fixed top-6 right-8 bg-white/15 border-2 border-white/40 text-white w-11 h-11 rounded-full text-2xl flex items-center justify-center hover:bg-white/30 transition-colors z-10"
        @click="closeLightbox"
      >×</button>

      <!-- Counter -->
      <div
        v-if="lightbox.images.length > 1"
        class="fixed top-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/30 px-3 py-1 rounded-full select-none"
      >
        {{ lightbox.index + 1 }} / {{ lightbox.images.length }}
      </div>

      <!-- Prev -->
      <button
        v-if="lightbox.images.length > 1"
        class="fixed left-4 top-1/2 -translate-y-1/2 bg-white/15 border-2 border-white/30 text-white w-12 h-12 rounded-full text-3xl flex items-center justify-center hover:bg-white/30 transition-colors select-none"
        @click="prevImage"
      >‹</button>

      <!-- Image -->
      <Transition name="lb-fade" mode="out-in">
        <img
          :key="lightbox.index"
          :src="currentImage.src"
          :alt="currentImage.label"
          class="max-w-[85vw] max-h-[85vh] rounded-lg shadow-[0_8px_64px_rgba(0,0,0,0.5)] object-contain select-none"
          @click.stop
        />
      </Transition>

      <!-- Label -->
      <div
        v-if="currentImage.label"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-4 py-1.5 rounded-full max-w-[80vw] text-center truncate"
      >{{ currentImage.label }}</div>

      <!-- Next -->
      <button
        v-if="lightbox.images.length > 1"
        class="fixed right-4 top-1/2 -translate-y-1/2 bg-white/15 border-2 border-white/30 text-white w-12 h-12 rounded-full text-3xl flex items-center justify-center hover:bg-white/30 transition-colors select-none"
        @click="nextImage"
      >›</button>
    </div>
  </Teleport>
</template>

<style scoped>
.lb-fade-enter-active,
.lb-fade-leave-active {
  transition: opacity 0.18s ease;
}
.lb-fade-enter-from,
.lb-fade-leave-to {
  opacity: 0;
}
</style>
