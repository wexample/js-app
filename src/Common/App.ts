import AsyncConstructor from '@wexample/js-helpers/Common/AsyncConstructor';

import AppService from './AppService';
import ServicesRegistryInterface from '../Interfaces/ServicesRegistryInterface';
import { arrayUnique } from "@wexample/js-helpers/Helper/Array";
import MixinsService from "@wexample/js-app/Services/MixinsService";

export default class App extends AsyncConstructor {
  public services: ServicesRegistryInterface = {};
  constructor(
    readyCallback?: any | Function,
    globalName: string = 'app'
  ) {
    super();

    window[globalName] = this;

    let doc = window.document;

    let run = async () => {
      // Allow children to perform setup before sealing.
      await this.beforeReady();

      // Every core properties has been set,
      // block any try to add extra property.
      this.seal();

      // Execute ready callbacks.
      await this.readyComplete();

      readyCallback && (await readyCallback());
    };

    let readyState = doc.readyState;

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

  getServices(): (typeof AppService | [typeof AppService, any[]])[] {
    return [
      MixinsService,
    ];
  }

  loadServices(services: (typeof AppService | [typeof AppService, any[]])[]): AppService[] {
    services = this.getServicesAndDependencies(services);
    let instances = [];

    services.forEach((service: (typeof AppService | [typeof AppService, any[]])) => {
      let serviceClass
      let serviceArgs: any[] = [];

      if (Array.isArray(service)) {
        serviceClass = service[0];
        serviceArgs = service[1];
      } else {
        serviceClass = service;
      }

      let name = serviceClass.serviceName;

      if (!this.services[name]) {
        this.services[name] = new serviceClass(this, ...serviceArgs);
        instances.push(this.services[name]);
      }
    });

    return instances;
  }

  async loadAndInitServices(
    services: (typeof AppService | [typeof AppService, any[]])[]
  ): Promise<any> {
    let loadedServices = this.loadServices(services);

    // Init mixins.
    return this.services.mixins.invokeUntilComplete(
      'hookInit',
      'app',
      [],
      undefined,
      loadedServices
    );
  }

  getServicesAndDependencies(
    services: (typeof AppService | [typeof AppService, any[]])[]
  ): (typeof AppService | [typeof AppService, any[]])[] {

    services.forEach((serviceDef: typeof AppService | [typeof AppService, any[]]) => {
      let serviceClass: typeof AppService;

      if (Array.isArray(serviceDef)) {
        serviceClass = serviceDef[0];
      } else {
        serviceClass = serviceDef;
      }

      if (serviceClass.dependencies) {
        services = [
          ...services,
          ...this.getServicesAndDependencies(serviceClass.dependencies),
        ];
      }
    });

    return arrayUnique(services) as (typeof AppService | [typeof AppService, any[]])[];
  }

  getService(name: string | object): AppService {
    name = (typeof name === 'string' ? name : (name as any).serviceName) as string

    return this.services[name];
  }
}
