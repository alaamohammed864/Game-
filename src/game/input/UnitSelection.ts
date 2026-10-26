export interface UnitLike {
  id?: string;
  mesh?: {
    material?: any;
    position?: any;
    rotation?: any;
  };
  [key: string]: any;
}

export class UnitSelection {
  public camera: any;
  public renderer: any;

  public units: UnitLike[] = [];
  public selected: UnitLike | null = null;

  constructor(camera: any = null, renderer: any = null) {
    this.camera = camera;
    this.renderer = renderer;

    this.units = [];
    this.selected = null;
  }

  public register(unit: UnitLike): void {
    if (unit && !this.units.includes(unit)) {
      this.units.push(unit);
    }
  }

  public unregister(unit: UnitLike): void {
    const index = this.units.indexOf(unit);
    if (index !== -1) {
      this.units.splice(index, 1);
    }
    if (this.selected === unit) {
      this.select(null);
    }
  }

  public select(unit: UnitLike | null): void {
    if (this.selected === unit) {
      return;
    }

    if (this.selected) {
      this.setHighlight(this.selected, false);
    }

    this.selected = unit;

    if (unit) {
      this.setHighlight(unit, true);
    }
  }

  public setHighlight(unit: UnitLike | null, enabled: boolean): void {
    if (!unit?.mesh) return;

    const materials = Array.isArray(unit.mesh.material)
      ? unit.mesh.material
      : [unit.mesh.material];

    for (const mat of materials) {
      if (mat && typeof mat === 'object' && 'emissive' in mat) {
        mat.emissiveIntensity = enabled ? 0.35 : 0;
      }
    }
  }

  public clear(): void {
    this.select(null);
  }

  // Backward compatibility helpers
  public registerUnit(id: string, unitData: any): void {
    const item: UnitLike = { id, ...unitData };
    this.register(item);
  }

  public unregisterUnit(id: string): void {
    const unit = this.units.find(u => u.id === id);
    if (unit) this.unregister(unit);
  }

  public getSelectedIds(): string[] {
    return this.selected?.id ? [this.selected.id] : [];
  }

  public getSelectedUnits(): UnitLike[] {
    return this.selected ? [this.selected] : [];
  }
}
