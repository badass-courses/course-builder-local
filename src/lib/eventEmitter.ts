import { EventEmitter } from 'events'

import { Post } from '../types'
import { remember } from './remember'

export type ExtensionEvents = {
	'post:updated': (post: Post) => void
	'post:created': (post: Post) => void
	'post:published': (post: Post) => void
	'posts:refresh': () => void
}

class TypedEventEmitter extends EventEmitter {
	emit<K extends keyof ExtensionEvents>(
		eventName: K,
		...args: Parameters<ExtensionEvents[K]>
	): boolean {
		return super.emit(eventName, ...args)
	}

	on<K extends keyof ExtensionEvents>(
		eventName: K,
		listener: ExtensionEvents[K],
	): this {
		return super.on(eventName, listener as (...args: any[]) => void)
	}
}

export const extensionEvents = remember(
	'extensionEvents',
	() => new TypedEventEmitter(),
)
