/**
 * GameSystems.ts
 * Master game systems orchestrator.
 */

import { UnitSimulation } from './simulation/UnitSimulation';
import { RouteManager } from './simulation/RouteManager';
import { OceanSystem, OceanSystemOptions } from './environment/OceanSystem';
import { WeatherSystem, WeatherSystemOptions } from './environment/WeatherSystem';
import { DayNightSystem, DayNightSystemOptions } from './environment/DayNightSystem';
import { EventEffectSystem } from './effects/EventEffectSystem';
import { ShipController, ShipControllerOptions } from './entities/ShipController';
import { AircraftController, AircraftControllerOptions } from './entities/AircraftController';
import { GroundUnitController, GroundUnitControllerOptions } from './entities/GroundUnitController';
import { WakeEffect, WakeEffectOptions } from './effects/WakeEffect';
import { UnitSelection } from './input/UnitSelection';

export interface GameSystemsOptions {
  scene?: any;
  camera?: any;
  sun?: any;
  oceanOptions?: OceanSystemOptions;
  weatherOptions?: WeatherSystemOptions;
  dayNightOptions?: DayNightSystemOptions;
  wakeOptions?: WakeEffectOptions;
}

export class GameSystems {
  public scene: any;
  public camera: any;
  public sun: any;

  public simulation: UnitSimulation;
  public routes: RouteManager;
  public routeManager: RouteManager; // Alias

  public ocean: OceanSystem | null;
  public weather: WeatherSystem;
  public effects: EventEffectSystem;
  public eventEffects: EventEffectSystem; // Alias
  public dayNight: DayNightSystem;

  public wakeEffect: WakeEffect;
  public selection: UnitSelection;
  public controllers: Map<string, ShipController | AircraftController | GroundUnitController>;

  public running: boolean;

  constructor(sceneOrOptions: any = null, camera: any = null, sun: any = null) {
    let scene = sceneOrOptions;
    let options: GameSystemsOptions = {};

    if (sceneOrOptions && typeof sceneOrOptions === 'object' && !('add' in sceneOrOptions) && !('children' in sceneOrOptions)) {
      options = sceneOrOptions;
      scene = options.scene ?? null;
      camera = options.camera ?? camera;
      sun = options.sun ?? sun;
    }

    this.scene = scene;
    this.camera = camera;
    this.sun = sun;

    this.simulation = new UnitSimulation();
    this.routes = new RouteManager();
    this.routeManager = this.routes;

    this.ocean = scene ? new OceanSystem(scene, options.oceanOptions) : null;
    this.weather = new WeatherSystem(scene);
    this.effects = new EventEffectSystem(scene);
    this.eventEffects = this.effects;

    this.dayNight = new DayNightSystem(scene, sun);
    this.wakeEffect = new WakeEffect(scene);
    this.selection = new UnitSelection(camera);

    this.controllers = new Map();
    this.running = true;
  }

  public init(scene: any, camera: any, sun: any = null, options: GameSystemsOptions = {}): void {
    this.scene = scene;
    this.camera = camera;
    this.sun = sun;

    if (!this.ocean && scene) {
      this.ocean = new OceanSystem(scene, options.oceanOptions);
    }
    if (this.weather && !this.weather.scene && scene) {
      this.weather.scene = scene;
    }
    if (this.effects && !this.effects.scene && scene) {
      this.effects.scene = scene;
    }
    if (this.dayNight && !this.dayNight.scene && scene) {
      this.dayNight.scene = scene;
      this.dayNight.sun = sun;
    }
    if (this.wakeEffect && !this.wakeEffect.scene && scene) {
      this.wakeEffect.scene = scene;
    }
    if (this.selection && !this.selection.camera && camera) {
      this.selection.camera = camera;
    }
  }

  public addShipController(id: string, mesh: any, options: ShipControllerOptions = {}): ShipController {
    const controller = new ShipController(mesh, this.ocean, options);
    this.controllers.set(id, controller);
    this.selection.register({ id, type: 'ship', controller, mesh });
    if (this.wakeEffect) {
      this.wakeEffect.create(mesh);
    }
    return controller;
  }

  public addAircraftController(id: string, mesh: any, options: AircraftControllerOptions = {}): AircraftController {
    const controller = new AircraftController(mesh, options);
    this.controllers.set(id, controller);
    this.selection.register({ id, type: 'aircraft', controller, mesh });
    return controller;
  }

  public addGroundUnitController(id: string, mesh: any, options: GroundUnitControllerOptions = {}): GroundUnitController {
    const controller = new GroundUnitController(mesh, options);
    this.controllers.set(id, controller);
    this.selection.register({ id, type: 'vehicle', controller, mesh });
    return controller;
  }

  public removeController(id: string): boolean {
    const unit = this.selection.units.find(u => u.id === id);
    if (unit) this.selection.unregister(unit);
    return this.controllers.delete(id);
  }

  public update(delta: number): void {
    if (!this.running) {
      return;
    }

    if (this.ocean) {
      this.ocean.update(delta);
    }

    this.simulation.update(delta);
    this.weather.update(delta);
    this.effects.update(delta);
    this.dayNight.update(delta);

    if (this.wakeEffect) {
      this.wakeEffect.update(delta);
    }

    for (const controller of this.controllers.values()) {
      controller.update(delta);
    }
  }

  public pause(): void {
    this.running = false;
    this.simulation.pause();
  }

  public resume(): void {
    this.running = true;
    this.simulation.resume();
  }

  public get paused(): boolean {
    return !this.running;
  }

  public set paused(val: boolean) {
    if (val) this.pause();
    else this.resume();
  }

  public setSpeed(speed: number): void {
    this.simulation.setSimulationSpeed(speed);
  }

  public destroy(): void {
    this.pause();
    if (this.ocean) {
      this.ocean.dispose();
      this.ocean = null;
    }
    this.routes.clear();
    this.effects.clear();
    this.wakeEffect.clear();
    this.selection.clear();
    this.controllers.clear();
  }

  public dispose(): void {
    this.destroy();
  }
}

export {
  UnitSimulation,
  RouteManager,
  OceanSystem,
  WeatherSystem,
  DayNightSystem,
  EventEffectSystem,
  ShipController,
  AircraftController,
  GroundUnitController,
  WakeEffect,
  UnitSelection
};
