/**
 * UnitSelection.js
 * Tactical unit selection manager with emissive highlighting.
 */

export class UnitSelection {
  constructor(camera = null, renderer = null) {
    this.camera = camera;
    this.renderer = renderer;

    this.units = [];
    this.selected = null;
  }

  register(unit) {
    if (
      unit &&
      !this.units.includes(unit)
    ) {
      this.units.push(unit);
    }
  }

  unregister(unit) {
    const index =
      this.units.indexOf(unit);

    if (index !== -1) {
      this.units.splice(
        index,
        1
      );
    }

    if (this.selected === unit) {
      this.select(null);
    }
  }

  select(unit) {
    if (
      this.selected === unit
    ) {
      return;
    }

    if (this.selected) {
      this.setHighlight(
        this.selected,
        false
      );
    }

    this.selected = unit;

    if (unit) {
      this.setHighlight(
        unit,
        true
      );
    }
  }

  setHighlight(
    unit,
    enabled
  ) {
    if (!unit?.mesh) return;

    const materials = Array.isArray(unit.mesh.material)
      ? unit.mesh.material
      : [unit.mesh.material];

    for (const mat of materials) {
      if (mat && "emissive" in mat) {
        mat.emissiveIntensity = enabled ? 0.35 : 0;
      }
    }
  }

  clear() {
    this.select(null);
  }

  // Backward compatibility helpers
  registerUnit(id, unitData) {
    const item = { id, ...unitData };
    this.register(item);
  }

  unregisterUnit(id) {
    const unit = this.units.find(u => u.id === id);
    if (unit) this.unregister(unit);
  }

  getSelectedIds() {
    return this.selected?.id ? [this.selected.id] : [];
  }

  getSelectedUnits() {
    return this.selected ? [this.selected] : [];
  }
}
