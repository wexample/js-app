import AsyncConstructor from '@wexample/js-helpers/Common/AsyncConstructor';

import AppService from './AppService';
import ServicesRegistryInterface from '../interfaces/ServicesRegistryInterface';

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

    ];
  }

  loadServices(services: (typeof AppService | [typeof AppService, any[]])[]): AppService[] {
    let instances = [];
    // TODO
    return instances;
  }

  async loadAndInitServices(
    services: (typeof AppService | [typeof AppService, any[]])[]
  ): Promise<any> {
    let loadedServices = this.loadServices(services);
    // TODO
  }

  getService(name: string | object): AppService {
    name = (typeof name === 'string' ? name : (name as any).serviceName) as string

    return this.services[name];
  }
}
