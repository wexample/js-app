import AppService from '@wexample/js-app/Common/AppService';

export default class MixinsService extends AppService {
  public static serviceName = 'mixins';

  /**
   * Execute a hook until all ext do not return false.
   * Useful to manage order when processing : an ext can wait for
   * another one to be executed.
   *
   * The pre-last arg of callback will be a registry of ext statuses.
   * The last arg of callback well be a next() method in case of async operation.
   *
   * @param method
   * @param args
   * @param group
   * @param timeoutLimit
   * @param services
   */
  invokeUntilComplete(
    method,
    group = 'app',
    args = [],
    timeoutLimit: number = 2000,
    services: AppService[] = Object.values(this.app.services) as AppService[]
  ): Promise<any> {
    return new Promise(async (resolve) => {
      const errorTrace: AppService[] = [];
      let loops: number = 0;
      const loopsLimit: number = 100;
      const registry: { [key: string]: string } = {};
      let service;

      while ((service = services.shift())) {
        const currentName = service.constructor.serviceName;
        const timeout = setTimeout(() => {
          const message = [
            `Mixins invocation timeout on method "${method}", stopping at "${currentName}".`,
            `Registry: ${JSON.stringify(registry)}.`,
          ].join(' ');

          throw new Error(message);
        }, timeoutLimit);

        const hooks = service.registerHooks();

        if (loops++ > loopsLimit) {
          const message = [
            `Stopping more than ${loops} recursions during services invocation on method "${method}", stopping at ${currentName}.`,
            `Trace: ${errorTrace.join(' -> ') || 'none'}.`,
            `Registry: ${JSON.stringify(registry)}.`,
          ].join(' ');

          throw new Error(message);
        } else if (loops > loopsLimit - 10) {
          errorTrace.push(service);
        }

        if (hooks && hooks[group] && hooks[group][method]) {
          const argsLocal = args.concat([registry]);
          registry[currentName] = await hooks[group][method].apply(service, argsLocal);
        }

        if (registry[currentName] === undefined) {
          registry[currentName] = AppService.LOAD_STATUS_COMPLETE;
        }

        // "wait" says to retry after processing other services.
        if (registry[currentName] === AppService.LOAD_STATUS_WAIT) {
          // Enqueue again.
          services.push(service);
        }

        clearTimeout(timeout);
      }

      resolve(true);
    });
  }
}
