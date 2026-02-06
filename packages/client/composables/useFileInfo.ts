import type { Ref } from 'vue'
import { ref } from 'vue'
import { isInputting } from '../state'

export interface UseFileInfo {
	filepath: Ref<string>
	raw: Ref<string>
	update: (raw: string) => Promise<void>
}

export function useFileInfo(): UseFileInfo {
	const filepath = ref('')
	const raw = ref('')

	async function load() {
		console.log('[SideEditor] load() called')
		try {
			const res = await fetch('/__slidev/file.json')
			console.log('[SideEditor] fetch status:', res.status)
			if (!res.ok)
				return
			const data = await res.json()
			console.log('[SideEditor] fetched data, raw length:', data.raw?.length)
			filepath.value = data.filepath
			raw.value = data.raw
			console.log('[SideEditor] raw ref set, length:', raw.value.length)
		}
		catch (e) {
			console.error('[SideEditor] load() failed:', e)
		}
	}

	async function update(content: string) {
		await fetch('/__slidev/file.json', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ raw: content }),
		})
	}

	load()

	if (__DEV__) {
		import.meta.hot?.on('slidev:update-file', (payload) => {
			if (!isInputting.value) {
				raw.value = payload.raw
			}
		})
	}

	return {
		filepath,
		raw,
		update,
	}
}
