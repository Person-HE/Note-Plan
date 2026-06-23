export interface Module {
  name: string
  dependencies?: string[]
  init?: () => Promise<void>
  destroy?: () => void
}

class ModuleRegistry {
  private modules: Map<string, Module> = new Map()
  private initialized: Set<string> = new Set()

  register(module: Module): void {
    if (this.modules.has(module.name)) {
      console.warn(`[ModuleRegistry] Module "${module.name}" already registered`)
      return
    }
    this.modules.set(module.name, module)
  }

  async init(moduleName: string): Promise<void> {
    const mod = this.modules.get(moduleName)
    if (!mod) {
      throw new Error(`[ModuleRegistry] Module "${moduleName}" not found`)
    }
    if (this.initialized.has(moduleName)) {
      return
    }

    if (mod.dependencies) {
      for (const dep of mod.dependencies) {
        await this.init(dep)
      }
    }

    if (mod.init) {
      await mod.init()
    }
    this.initialized.add(moduleName)
  }

  async initAll(): Promise<void> {
    for (const name of this.modules.keys()) {
      await this.init(name)
    }
  }

  destroy(moduleName: string): void {
    const mod = this.modules.get(moduleName)
    if (mod?.destroy) {
      mod.destroy()
    }
    this.initialized.delete(moduleName)
  }

  destroyAll(): void {
    for (const name of this.initialized) {
      this.destroy(name)
    }
  }

  isInitialized(moduleName: string): boolean {
    return this.initialized.has(moduleName)
  }

  getModule(moduleName: string): Module | undefined {
    return this.modules.get(moduleName)
  }

  getAllModuleNames(): string[] {
    return Array.from(this.modules.keys())
  }
}

export const moduleRegistry = new ModuleRegistry()
