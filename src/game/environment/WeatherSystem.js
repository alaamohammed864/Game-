/**
 * WeatherSystem.js
 * Atmospheric environmental weather manager supporting fog and rain states.
 */

export class WeatherSystem {
  constructor(scene = null) {
    this.scene = scene;

    this.weather = "clear";
    this.intensity = 0;

    this.time = 0;

    this.rain = null;
    this.fog = null;

    // Tactical/wind parameters
    this.wind = { x: 1.2, z: 0.8, speed: 15 };
    this.visibility = 1.0;
  }

  setWeather(
    type,
    intensity = 1
  ) {
    this.weather = type;

    this.intensity =
      Math.max(
        0,
        Math.min(
          1,
          intensity
        )
      );

    this.updateVisibility();
    this.apply();
  }

  apply() {
    if (!this.scene) return;

    if (
      this.weather ===
      "fog"
    ) {
      this.scene.fog = {
        type: "Fog",
        intensity:
          this.intensity
      };
    }

    if (
      this.weather ===
      "clear"
    ) {
      this.scene.fog = null;
    }

    // Rain particles should be
    // connected to the existing
    // particle renderer when available.
  }

  update(delta) {
    this.time += delta;

    if (
      this.weather ===
      "rain"
    ) {
      // Hook for rain particle system.
      // Keep environmental simulation
      // independent from gameplay logic.
    }

    // Gentle wind oscillation
    this.wind.speed = Math.max(5, Math.min(60, this.wind.speed + Math.sin(this.time * 0.5) * 0.2));
  }

  updateVisibility() {
    switch (this.weather.toLowerCase()) {
      case 'clear':
        this.visibility = 1.0;
        break;
      case 'fog':
        this.visibility = Math.max(0.2, 1.0 - this.intensity * 0.65);
        break;
      case 'rain':
        this.visibility = Math.max(0.4, 1.0 - this.intensity * 0.35);
        break;
      case 'storm':
        this.visibility = 0.40;
        break;
      case 'snow':
        this.visibility = 0.55;
        break;
      default:
        this.visibility = 1.0;
    }
  }

  getTacticalModifiers() {
    const w = this.weather.toLowerCase();
    switch (w) {
      case 'storm':
        return { airMissionAllowed: false, navalAccuracy: 0.65, groundSpeed: 0.75 };
      case 'rain':
        return { airMissionAllowed: true, navalAccuracy: 0.85, groundSpeed: 0.85 };
      case 'fog':
        return { airMissionAllowed: true, navalAccuracy: 0.70, groundSpeed: 0.90 };
      case 'snow':
        return { airMissionAllowed: true, navalAccuracy: 0.80, groundSpeed: 0.70 };
      case 'clear':
      default:
        return { airMissionAllowed: true, navalAccuracy: 1.0, groundSpeed: 1.0 };
    }
  }

  setCondition(condition) {
    this.setWeather(condition.toLowerCase());
  }

  get condition() {
    return this.weather.toUpperCase();
  }
}
