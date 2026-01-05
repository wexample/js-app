import AppService from '@wexample/js-app/Common/AppService';
import type { AppServiceConstructor } from '../Types/AppServiceTypes';

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
  async invokeUntilComplete(
    method: string,
    group: string = 'app',
    args: unknown[] = [],
    timeoutLimit: number = 2000,
    services: AppService[] = Object.values(this.app.services) as AppService[]
  ): Promise<boolean> {
    const errorTrace: AppService[] = [];
    let loops: number = 0;
    const loopsLimit: number = 100;
    const registry: Record<string, unknown> = {};

    while (true) {
      const service = services.shift();
      if (!service) {
        break;
      }

      const currentName = (service.constructor as AppServiceConstructor).serviceName;
      const timeout = setTimeout(() => {
        const message = [
          `Mixins invocation timeout on method "${method}", stopping at "${currentName}".`,
          `Registry: ${JSON.stringify(registry)}.`,
        ].join(' ');

        throw new Error(message);
      }, timeoutLimit);

      const hooks = service.registerHooks() as Record<string, Record<string, unknown>> | undefined;
      const hook = hooks?.[group]?.[method];

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

      if (typeof hook === 'function') {
        const argsLocal = args.concat([registry]);
        registry[currentName] = await (hook as (...hookArgs: unknown[]) => unknown).apply(
          service,
          argsLocal
        );
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

    return true;
  }
}
