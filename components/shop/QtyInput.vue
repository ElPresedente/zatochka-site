<script setup lang="ts">
const props = defineProps<{
  qty: number
  stock: number
  size?: 'sm' | 'md' | 'lg'
}>()
const emit = defineEmits<{ update: [qty: number] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const inputValue = ref(String(props.qty))
const exceeded = ref(false)
let exceededTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.qty, (v) => {
  if (document.activeElement !== inputEl.value) {
    inputValue.value = String(v)
  }
})

onUnmounted(() => { if (exceededTimer) clearTimeout(exceededTimer) })

function triggerExceeded() {
  exceeded.value = true
  if (exceededTimer) clearTimeout(exceededTimer)
  exceededTimer = setTimeout(() => { exceeded.value = false }, 3000)
}

function dec() {
  exceeded.value = false
  if (exceededTimer) { clearTimeout(exceededTimer); exceededTimer = null }
  emit('update', props.qty - 1)
}

function inc() {
  if (props.qty >= props.stock) { triggerExceeded(); return }
  exceeded.value = false
  emit('update', props.qty + 1)
}

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const raw = el.value.replace(/\D/g, '')
  inputValue.value = raw
  el.value = raw
}

function commit() {
  const num = parseInt(inputValue.value, 10)
  if (isNaN(num) || num <= 0) {
    inputValue.value = String(props.qty)
    return
  }
  if (num > props.stock) {
    inputValue.value = String(props.stock)
    triggerExceeded()
    emit('update', props.stock)
    return
  }
  exceeded.value = false
  inputValue.value = String(num)
  emit('update', num)
}

const btnClass = computed(() => {
  const sz = { sm: 'w-7 h-7 rounded-lg', md: 'w-9 h-9 rounded-xl', lg: 'w-11 h-11 rounded-xl' }
  return sz[props.size ?? 'md']
})

const inputClass = computed(() => {
  const sz = { sm: 'w-9 h-7 text-sm', md: 'w-10 h-9 text-base', lg: 'w-12 h-11 text-xl font-bold' }
  return sz[props.size ?? 'md']
})
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <div class="flex items-center gap-2">
      <button
        class="bg-[#f0f0f0] font-bold hover:bg-brand hover:text-white transition-colors flex items-center justify-center shrink-0"
        :class="btnClass"
        @click="dec"
      >−</button>
      <input
        ref="inputEl"
        :value="inputValue"
        type="text"
        inputmode="numeric"
        class="text-center font-semibold border border-[#e0e0e0] rounded-lg outline-none focus:border-brand transition-colors"
        :class="inputClass"
        @input="onInput"
        @blur="commit"
        @keydown.enter.prevent="inputEl?.blur()"
      />
      <button
        class="bg-[#f0f0f0] font-bold hover:bg-brand hover:text-white transition-colors flex items-center justify-center disabled:opacity-40 disabled:hover:bg-[#f0f0f0] disabled:hover:text-inherit shrink-0"
        :class="btnClass"
        :disabled="qty >= stock"
        @click="inc"
      >+</button>
    </div>
    <Transition name="hint-fade">
      <div v-if="exceeded" class="text-xs text-orange-500 font-medium leading-tight">
        превышено допустимое количество
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hint-fade-enter-active, .hint-fade-leave-active { transition: opacity 0.2s; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; }
</style>
