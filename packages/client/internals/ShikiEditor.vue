<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { useIME } from '../composables/useIME'

const props = defineProps<{
  placeholder?: string
}>()
const content = defineModel<string>({ required: true })
const emit = defineEmits<{
  'update:cursorLine': [line: number]
}>()
const { composingContent, onInput: onIMEInput, onCompositionEnd } = useIME(content)

watch(content, (v) => {
  console.log('[ShikiEditor] model value changed, length:', v.length)
}, { immediate: true })

const textareaEl = ref<HTMLTextAreaElement | null>(null)

function getCursorLine() {
  const el = textareaEl.value
  if (!el)
    return
  const text = el.value.slice(0, el.selectionStart)
  const line = text.split('\n').length
  emit('update:cursorLine', line)
}

function onInput(e: Event) {
  onIMEInput(e)
  if (e instanceof InputEvent && !e.isComposing)
    getCursorLine()
}

const highlight = shallowRef<((code: string) => string) | null>(null)
import('../setup/shiki').then(async (m) => {
  const { getEagerHighlighter, defaultHighlightOptions } = await m.default()
  const highlighter = await getEagerHighlighter()
  highlight.value = (code: string) => highlighter.codeToHtml(code, {
    ...defaultHighlightOptions,
    lang: 'markdown',
  })
  console.log('[ShikiEditor] highlight loaded')
})
</script>

<template>
  <div class="absolute left-3 right-0 inset-y-2 font-mono overflow-x-hidden overflow-y-auto cursor-text">
    <div v-if="highlight" class="relative w-full h-max min-h-full">
      <div class="relative w-full h-max" v-html="`${highlight(composingContent)}&nbsp;`" />
      <textarea
        ref="textareaEl" v-model="composingContent" :placeholder="props.placeholder"
        class="absolute inset-0 resize-none text-transparent bg-transparent focus:outline-none caret-black dark:caret-white overflow-y-hidden"
        @input="onInput"
        @click="getCursorLine"
        @keyup="getCursorLine"
        @compositionend="onCompositionEnd"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(code),
textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-feature-settings: normal;
  font-variation-settings: normal;
  font-size: 1em;
  text-wrap: wrap;
  word-break: normal;
  overflow-wrap: break-word;
  display: block;
  width: 100%;
}
:deep(pre.shiki) {
  background-color: transparent;
}
</style>
