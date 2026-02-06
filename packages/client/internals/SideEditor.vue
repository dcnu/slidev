<script setup lang="ts">
import { throttledWatch, useEventListener } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useFileInfo } from '../composables/useFileInfo'
import { useNav } from '../composables/useNav'
import { activeElement, editorHeight, editorWidth, isInputting, showEditor, isEditorVertical as vertical } from '../state'
import IconButton from './IconButton.vue'
import ShikiEditor from './ShikiEditor.vue'

const props = defineProps<{
	resize?: boolean
}>()

const { go, openInEditor } = useNav()
const { raw, update } = useFileInfo()

const content = ref('')
const dirty = ref(false)

let loaded = false
watch(
	raw,
	(v) => {
		console.log('[SideEditor] watcher fired — v.length:', v.length, 'loaded:', loaded, 'isInputting:', isInputting.value)
		if (!loaded || !isInputting.value) {
			content.value = v
			dirty.value = false
			if (v) loaded = true
			console.log('[SideEditor] content SET, length:', v.length, 'loaded now:', loaded)
		}
		else {
			console.log('[SideEditor] content SKIPPED')
		}
	},
	{ immediate: true },
)

const contentRef = computed({
	get() { return content.value },
	set(v) {
		if (content.value.trim() !== v.trim())
			dirty.value = true
		content.value = v
	},
})

async function save() {
	dirty.value = false
	await update(content.value)
}

function close() {
	showEditor.value = false
}

useEventListener('keydown', (e) => {
	if (activeElement.value?.tagName === 'TEXTAREA' && e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
		save()
		e.preventDefault()
	}
})

throttledWatch(
	content,
	() => {
		if (dirty.value)
			save()
	},
	{ throttle: 500 },
)

function getSlideFromLine(line: number) {
	const lines = content.value.split('\n')
	let slideNo = 1

	for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
		const trimmed = lines[i].trimEnd()
		if (trimmed.startsWith('---') && trimmed[3] !== '-') {
			if (i === 0) {
				// First slide frontmatter — skip to closing ---
				for (i += 1; i < lines.length; i++) {
					if (lines[i].trimEnd() === '---')
						break
				}
				continue
			}
			slideNo++
			// Check if next line has content (slide frontmatter)
			const next = lines[i + 1]
			if (next?.trim()) {
				for (i += 1; i < lines.length; i++) {
					if (lines[i].trimEnd() === '---')
						break
				}
			}
		}
		// Skip code blocks
		else if (trimmed.trimStart().startsWith('```')) {
			const fence = trimmed.match(/^\s*`+/)![0]
			for (i += 1; i < lines.length; i++) {
				if (lines[i].startsWith(fence))
					break
			}
		}
	}
	return slideNo
}

function onCursorLine(line: number) {
	const slideNo = getSlideFromLine(line)
	go(slideNo)
}

const handlerDown = ref(false)
function onHandlerDown() {
	handlerDown.value = true
}
function updateSize(v?: number) {
	if (vertical.value)
		editorHeight.value = Math.min(Math.max(300, v ?? editorHeight.value), window.innerHeight - 200)
	else
		editorWidth.value = Math.min(Math.max(318, v ?? editorWidth.value), window.innerWidth - 200)
}

if (props.resize) {
	useEventListener('pointermove', (e) => {
		if (handlerDown.value) {
			updateSize(vertical.value
				? window.innerHeight - e.pageY
				: e.pageX)
		}
	}, { passive: true })
	useEventListener('pointerup', () => {
		handlerDown.value = false
	})
	useEventListener('resize', () => {
		updateSize()
	})
}
</script>

<template>
	<div
		v-if="resize" class="fixed bg-gray-400 select-none opacity-0 hover:opacity-10 z-dragging"
		:class="vertical ? 'left-0 right-0 w-full h-10px' : 'top-0 bottom-0 w-10px h-full'" :style="{
			opacity: handlerDown ? '0.3' : undefined,
			bottom: vertical ? `${editorHeight - 5}px` : undefined,
			left: !vertical ? `${editorWidth - 5}px` : undefined,
			cursor: vertical ? 'row-resize' : 'col-resize',
		}" @pointerdown="onHandlerDown"
	/>
	<div
		class="shadow bg-main p-2 pt-4 grid grid-rows-[max-content_1fr] h-full overflow-hidden"
		:class="resize ? 'border-r border-gray-400 border-opacity-20' : ''"
		:style="resize ? {
			height: vertical ? `${editorHeight}px` : undefined,
			width: !vertical ? `${editorWidth}px` : undefined,
		} : {}"
	>
		<div class="flex pb-2 text-xl -mt-1">
			<span class="text-2xl pt-1">File</span>
			<div class="flex-auto" />
			<template v-if="resize">
				<IconButton v-if="vertical" title="Dock to left" @click="vertical = false">
					<div class="i-carbon:open-panel-left" />
				</IconButton>
				<IconButton v-else title="Dock to bottom" @click="vertical = true">
					<div class="i-carbon:open-panel-bottom" />
				</IconButton>
			</template>
			<IconButton title="Open in editor" @click="openInEditor()">
				<div class="i-carbon:launch" />
			</IconButton>
			<IconButton title="Close" @click="close">
				<div class="i-carbon:close" />
			</IconButton>
		</div>
		<div class="relative overflow-hidden rounded" style="background-color: var(--slidev-code-background)">
			<ShikiEditor v-model="contentRef" placeholder="Edit slides..." @update:cursor-line="onCursorLine" />
		</div>
	</div>
</template>
