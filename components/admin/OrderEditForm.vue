<script setup lang="ts">
defineProps<{
  userComment: string
  saving: boolean
  hasChanges: boolean
}>()

const sellerComment = defineModel<string>('sellerComment', { required: true })

const emit = defineEmits<{
  save: []
}>()

function hasComment(value: string) {
  return value.trim().length > 0
}
</script>

<template>
  <div class="px-4 lg:px-7 py-4 lg:py-5 flex flex-col gap-4 lg:gap-5 border-b border-[#eee]">
    <div>
      <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий клиента</label>
      <div class="min-h-[64px] rounded-xl bg-[#f8f8f8] border border-[#eee] px-4 py-3 text-sm text-[#555] leading-relaxed whitespace-pre-wrap">
        {{ hasComment(userComment) ? userComment : 'Нет комментария' }}
      </div>
    </div>

    <div>
      <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий продавца</label>
      <textarea
        v-model="sellerComment"
        rows="3"
        maxlength="2000"
        placeholder="Доп. работы, скидка или служебная заметка"
        class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none"
      />
    </div>

    <div class="flex justify-end">
      <button
        class="px-5 py-2.5 rounded-xl border-2 border-brand text-brand text-sm font-semibold hover:bg-brand/10 transition-colors disabled:opacity-50"
        :disabled="saving || !hasChanges"
        @click="emit('save')"
      >
        {{ saving ? 'Сохранение...' : 'Сохранить изменения' }}
      </button>
    </div>
  </div>
</template>
