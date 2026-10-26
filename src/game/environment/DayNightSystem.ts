export type DiurnalPhase = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

export interface DayNightSystemOptions {
  scene?: any;
  sun?: any;
  startHour?: number;
  dayLength?: number;
}

export interface LightParameters {
  sunIntensity: number;
  ambientIntensity: number;
  isNight: boolean;
  phase: DiurnalPhase;
}

export class DayNightSystem {
  public scene: any;
  public sun: any;

  public timeOfDay: number;
  public dayLength: number;

  constructor(scene: any = null, sun: any = null) {
    this.scene = scene;
    this.sun = sun;

    this.timeOfDay = 12;
    this.dayLength = 300;
  }

  public setTime(hours: number): void {
    this.timeOfDay = ((hours % 24) + 24) % 24;
  }

  public update(delta: number): void {
    this.timeOfDay += (24 / this.dayLength) * delta;

    if (this.timeOfDay >= 24) {
      this.timeOfDay = 0;
    }

    this.updateSun();
  }

  public updateSun(): void {
    if (!this.sun) return;

    const angle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const radius = 100;

    if (this.sun.position) {
      this.sun.position.x = Math.cos(angle) * radius;
      this.sun.position.y = Math.sin(angle) * radius;
      this.sun.position.z = 30;
    }

    if (this.sun.intensity !== undefined) {
      const daylight = Math.max(0.05, Math.sin(angle));
      this.sun.intensity = 0.3 + daylight * 1.2;
    }
  }

  // Backward compatibility helpers
  public get currentHour(): number {
    return this.timeOfDay;
  }

  public set currentHour(val: number) {
    this.setTime(val);
  }

  public getPhase(): DiurnalPhase {
    if (this.timeOfDay >= 5 && this.timeOfDay < 8) return 'DAWN';
    if (this.timeOfDay >= 8 && this.timeOfDay < 18) return 'DAY';
    if (this.timeOfDay >= 18 && this.timeOfDay < 21) return 'DUSK';
    return 'NIGHT';
  }

  public getSunDirection(): { x: number; y: number; z: number } {
    const angle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
      z: 0.3
    };
  }

  public getLightParameters(): LightParameters {
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
