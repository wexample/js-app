import MixinsService from '@wexample/js-app/Services/MixinsService';
import AsyncConstructor from '@wexample/js-helpers/Common/AsyncConstructor';
import { arrayUnique } from '@wexample/js-helpers/Helper/Array';
import type ServicesRegistryInterface from '../Interfaces/ServicesRegistryInterface';
import type { AppServiceConstructor, ServiceDefinition } from '../Types/AppServiceTypes';
import type AppService from './AppService';

type ReadyCallback = (() => void) | (() => Promise<void>);

export default class App extends AsyncConstructor {
  public services: ServicesRegistryInterface = {};

  constructor(readyCallback?: ReadyCallback, globalName: string = 'app') {
    super();

    window[globalName] = this;

    const doc = window.document;

    const run = async () => {
      // Allow children to perform setup before sealing.
      await this.beforeReady();

      // Every core properties has been set,
      // block any try to add extra property.
      this.seal();

      // Execute ready callbacks.
      await this.readyComplete();

      readyCallback && (await readyCallback());
    };

    const readyState = doc.readyState;

    // Document has been parsed.
    // Allows running after loaded event.
    if (['complete', 'loaded', 'interactive'].indexOf(readyState) !== -1) {
      this.defer(run);
    } else {
      doc.addEventListener('DOMContentLoaded', run);
    }
  }

  // Hook for children: executed after DOM is ready but before seal().
  protected async beforeReady(): Promise<void> {
    await this.loadAndInitServices(this.getServices());
  }

  getServices(): ServiceDefinition[] {
    return [MixinsService];
  }

  loadServices(services: ServiceDefinition[]): AppService[] {
    services = this.getServicesAndDependencies(services);
    const instances = [];

    services.forEach((service: ServiceDefinition) => {
      let serviceClass: AppServiceConstructor;
      let serviceArgs: unknown[] = [];

      if (Array.isArray(service)) {
        serviceClass = service[0];
        serviceArgs = service[1];
      } else {
        serviceClass = service;
      }

      const name = serviceClass.serviceName;

      if (!this.services[name]) {
        this.services[name] = new serviceClass(this, ...serviceArgs);
        instances.push(this.services[name]);
      }
    });

    return instances;
  }

  async loadAndInitServices(services: ServiceDefinition[]): Promise<unknown> {
    const loadedServices = this.loadServices(services);

    return this.services.mixins.invokeUntilComplete(
      'hookInit',
      'app',
      [],
      undefined,
      loadedServices
    );
  }

  getServicesAndDependencies(services: ServiceDefinition[]): ServiceDefinition[] {
    services.forEach((serviceDef: ServiceDefinition) => {
      let serviceClass: AppServiceConstructor;

      if (Array.isArray(serviceDef)) {
        serviceClass = serviceDef[0];
      } else {
        serviceClass = serviceDef;
      }

      if (serviceClass.dependencies) {
        services = [...services, ...this.getServicesAndDependencies(serviceClass.dependencies)];
      }
    });

    return arrayUnique(services) as ServiceDefinition[];
  }

  getService(name: string | { serviceName: string }): AppService {
    name = typeof name === 'string' ? name : name.serviceName;

    return this.services[name];
  }
}
