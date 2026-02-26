import {
	defaultCustomizationSettings,
	type Character,
	type Message,
	type Connection,
	type CustomizationSettings
} from '$lib/types';

const DB_NAME = 'convly-studio-db';
const DB_VERSION = 1;

interface ConvlyDB {
	characters: Character[];
	messages: Message[];
	connections: Connection[];
	customizeSettings: CustomizationSettings;
	viewport: { x: number; y: number; zoom: number } | null;
}

const defaultData: ConvlyDB = {
	characters: [],
	messages: [],
	connections: [],
	customizeSettings: defaultCustomizationSettings,
	viewport: null
};

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (dbInstance) {
			resolve(dbInstance);
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error('Failed to open IndexedDB:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			dbInstance = request.result;
			resolve(dbInstance);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			
			if (!db.objectStoreNames.contains('appState')) {
				db.createObjectStore('appState', { keyPath: 'key' });
			}
		};
	});
}

export async function loadFromIndexedDB(): Promise<ConvlyDB> {
	try {
		const db = await openDatabase();
		
		return new Promise((resolve) => {
			const transaction = db.transaction('appState', 'readonly');
			const store = transaction.objectStore('appState');
			
			const data: Partial<ConvlyDB> = {};
			let completed = 0;
			const keys: (keyof ConvlyDB)[] = ['characters', 'messages', 'connections', 'customizeSettings', 'viewport'];
			
			keys.forEach((key) => {
				const request = store.get(key);
				
				request.onsuccess = () => {
					if (request.result) {
						data[key] = request.result.value;
					}
					completed++;
					
					if (completed === keys.length) {
						const mergedCustomizeSettings = {
							...defaultCustomizationSettings,
							...(data.customizeSettings ?? {})
						} as CustomizationSettings;
						resolve({
							characters: data.characters || defaultData.characters,
							messages: data.messages || defaultData.messages,
							connections: data.connections || defaultData.connections,
							customizeSettings: mergedCustomizeSettings,
							viewport: data.viewport || defaultData.viewport
						});
					}
				};
				
				request.onerror = () => {
					completed++;
					if (completed === keys.length) {
						resolve({
							...defaultData,
							...data
						});
					}
				};
			});
		});
	} catch (error) {
		console.error('Error loading from IndexedDB:', error);
		return defaultData;
	}
}

export async function saveToIndexedDB<K extends keyof ConvlyDB>(
	key: K,
	value: ConvlyDB[K]
): Promise<void> {
	try {
		const db = await openDatabase();
		
		return new Promise((resolve, reject) => {
			const transaction = db.transaction('appState', 'readwrite');
			const store = transaction.objectStore('appState');
			
			const request = store.put({ key, value });
			
			request.onsuccess = () => {
				resolve();
			};
			
			request.onerror = () => {
				console.error('Error saving to IndexedDB:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error saving to IndexedDB:', error);
	}
}

export async function clearIndexedDB(): Promise<void> {
	try {
		const db = await openDatabase();
		
		return new Promise((resolve, reject) => {
			const transaction = db.transaction('appState', 'readwrite');
			const store = transaction.objectStore('appState');
			
			const request = store.clear();
			
			request.onsuccess = () => {
				resolve();
			};
			
			request.onerror = () => {
				console.error('Error clearing IndexedDB:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error clearing IndexedDB:', error);
	}
}

export async function exportProject(): Promise<string> {
	const data = await loadFromIndexedDB();
	return JSON.stringify(data, null, 2);
}

export async function importProject(jsonString: string): Promise<ConvlyDB> {
	try {
		const data = JSON.parse(jsonString) as Partial<ConvlyDB>;
		
		if (data.characters) {
			await saveToIndexedDB('characters', data.characters);
		}
		if (data.messages) {
			await saveToIndexedDB('messages', data.messages);
		}
		if (data.connections) {
			await saveToIndexedDB('connections', data.connections);
		}
		if (data.customizeSettings) {
			await saveToIndexedDB('customizeSettings', data.customizeSettings);
		}
		
		return await loadFromIndexedDB();
	} catch (error) {
		console.error('Error importing project:', error);
		throw error;
	}
}

export const defaultSettings = defaultCustomizationSettings;
export type { ConvlyDB };
