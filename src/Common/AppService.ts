import type { ServiceDefinition } from '../Types/AppServiceTypes.js';
import type App from './App.js';
import AppChild from './AppChild.js';

export default abstract class AppService extends AppChild {
  public static LOAD_STATUS_COMPLETE = 'complete';
  public static LOAD_STATUS_WAIT = 'wait';

  public app: App;
  public static dependencies: ServiceDefinition[] = [];
  public static serviceName: string;

  registerHooks(): {
    app?: Record<string, unknown>;
    page?: Record<string, unknown>;
    renderNode?: Record<string, unknown>;
  } {
    return {};
  }

  registerMethods(_object: unknown, _group: string) {
    return {};
  }
}
