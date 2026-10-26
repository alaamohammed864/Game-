/**
 * GameSystems.js
 * Master game systems orchestrator.
 */

import { UnitSimulation }
  from "./simulation/UnitSimulation.js";

import { RouteManager }
  from "./simulation/RouteManager.js";

import { OceanSystem }
  from "./environment/OceanSystem.js";

import { WeatherSystem }
  from "./environment/WeatherSystem.js";

import { DayNightSystem }
  from "./environment/DayNightSystem.js";

import { EventEffectSystem }
  from "./effects/EventEffectSystem.js";

import { ShipController }
  from "./entities/ShipController.js";

import { AircraftController }
  from "./entities/AircraftController.js";

import { GroundUnitController }
  from "./entities/GroundUnitController.js";

import { WakeEffect }
  from "./effects/WakeEffect.js";

import { UnitSelection }
  from "./input/UnitSelection.js";

export class GameSystems {
  constructor(sceneOrOptions = null, camera = null, sun = null) {
    let scene = sceneOrOptions;
    let options = {};

    if (sceneOrOptions && typeof sceneOrOptions === 'object' && !('add' in sceneOrOptions) && !('children' in sceneOrOptions)) {
      options = sceneOrOptions;
      scene = options.scene ?? null;
      camera = options.camera ?? camera;
      sun = options.sun ?? sun;
    }

    this.scene = scene;
    this.camera = camera;
    this.sun = sun;

    this.simulation =
      new UnitSimulation();

    this.routes =
      new RouteManager();

    // Compatibility alias
    this.routeManager = this.routes;

    this.ocean =
      scene ? new OceanSystem(scene, options.oceanOptions) : null;

    this.weather =
      new WeatherSystem(scene);

    this.effects =
      new EventEffectSystem(scene);

    // Compatibility alias
    this.eventEffects = this.effects;

    this.dayNight =
      new DayNightSystem(
        scene,
        sun
      );

    this.wakeEffect =
      new WakeEffect(scene);

    this.selection =
      new UnitSelection(camera);

    this.controllers = new Map();

    this.running = true;
  }

  init(scene, camera, sun = null, options = {}) {
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

  addShipController(id, mesh, options = {}) {
    const controller = new ShipController(mesh, this.ocean, options);
    this.controllers.set(id, controller);
    this.selection.register({ id, type: 'ship', controller, mesh });
    if (this.wakeEffect) {
      this.wakeEffect.create(mesh);
    }
    return controller;
  }

  addAircraftController(id, mesh, options = {}) {
    const controller = new AircraftController(mesh, options);
    this.controllers.set(id, controller);
    this.selection.register({ id, type: 'aircraft', controller, mesh });
    return controller;
  }

  addGroundUnitController(id, mesh, options = {}) {
    const controller = new GroundUnitController(mesh, options);
    this.controllers.set(id, controller);
    this.selection.register({ id, type: 'vehicle', controller, mesh });
    return controller;
  }

  removeController(id) {
    const unit = this.selection.units.find(u => u.id === id);
    if (unit) this.selection.unregister(unit);
    return this.controllers.delete(id);
  }

  update(delta) {
    if (!this.running) {
      return;
    }

    if (this.ocean) {
      this.ocean.update(delta);
    }

    this.simulation.update(
      delta
    );

    this.weather.update(
      delta
    );

    this.effects.update(
      delta
    );

    this.dayNight.update(
      delta
    );

    if (this.wakeEffect) {
      this.wakeEffect.update(delta);
    }

    for (const controller of this.controllers.values()) {
      controller.update(delta);
    }
  }

  pause() {
    this.running = false;
    this.simulation.pause();
  }

  resume() {
    this.running = true;
    this.simulation.resume();
  }

  get paused() {
    return !this.running;
  }

  set paused(val) {
    if (val) this.pause();
    else this.resume();
  }

  setSpeed(speed) {
    this.simulation
      .setSimulationSpeed(
        speed
      );
  }

  destroy() {
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

  dispose() {
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
