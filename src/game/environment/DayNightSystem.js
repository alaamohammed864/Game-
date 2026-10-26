/**
 * DayNightSystem.js
 * Diurnal solar lighting cycle simulation.
 * Calculates sun orbital positioning, solar zenith elevation, and directional light intensity.
 */

export class DayNightSystem {
  constructor(scene = null, sun = null) {
    this.scene = scene;
    this.sun = sun;

    this.timeOfDay = 12;
    this.dayLength = 300;
  }

  setTime(hours) {
    this.timeOfDay =
      ((hours % 24) + 24) % 24;
  }

  update(delta) {
    this.timeOfDay +=
      (24 / this.dayLength) *
      delta;

    if (
      this.timeOfDay >= 24
    ) {
      this.timeOfDay = 0;
    }

    this.updateSun();
  }

  updateSun() {
    if (!this.sun) return;

    const angle =
      ((this.timeOfDay - 6) /
        24) *
      Math.PI * 2;

    const radius = 100;

    if (this.sun.position) {
      this.sun.position.x =
        Math.cos(angle) *
        radius;

      this.sun.position.y =
        Math.sin(angle) *
        radius;

      this.sun.position.z =
        30;
    }

    if (
      this.sun.intensity !==
      undefined
    ) {
      const daylight =
        Math.max(
          0.05,
          Math.sin(angle)
        );

      this.sun.intensity =
        0.3 +
        daylight * 1.2;
    }
  }

  // Compatibility helpers
  get currentHour() {
    return this.timeOfDay;
  }

  set currentHour(val) {
    this.setTime(val);
  }

  getPhase() {
    if (this.timeOfDay >= 5 && this.timeOfDay < 8) return 'DAWN';
    if (this.timeOfDay >= 8 && this.timeOfDay < 18) return 'DAY';
    if (this.timeOfDay >= 18 && this.timeOfDay < 21) return 'DUSK';
    return 'NIGHT';
  }

  getSunDirection() {
    const angle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
      z: 0.3
    };
  }

  getLightParameters() {
    const dir = this.getSunDirection();
    const daylight = Math.max(0.05, dir.y);

    return {
      sunIntensity: this.sun?.intensity ?? (0.3 + daylight * 1.2),
      ambientIntensity: 0.25 + daylight * 0.85,
      isNight: dir.y <= 0.05,
      phase: this.getPhase()
    };
  }
}
