import { db, type SettingsRecord } from './database'

class StorageService {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const record = await db.settings.get(key)
    if (!record) return defaultValue
    try {
      return JSON.parse(record.value) as T
    } catch {
      return defaultValue
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await db.settings.put({
      key,
      value: JSON.stringify(value),
    })
  }

  async remove(key: string): Promise<void> {
    await db.settings.delete(key)
  }

  async getAll(): Promise<Record<string, unknown>> {
    const all = await db.settings.toArray()
    const result: Record<string, unknown> = {}
    for (const record of all) {
      try {
        result[record.key] = JSON.parse(record.value)
      } catch {
        result[record.key] = record.value
      }
    }
    return result
  }
}

export const storageService = new StorageService()
