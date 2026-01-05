import App from './App';
import AppChild from './AppChild';

export default abstract class AppService extends AppChild {
  public static LOAD_STATUS_COMPLETE = 'complete';
  public static LOAD_STATUS_WAIT = 'wait';

  public app: App;
  public static dependencies: typeof AppService[] = [];
  public static serviceName: string = 'mixins';

  registerHooks(): { app?: {}; page?: {}, renderNode?: {} } {
    return {};
  }

  registerMethods(object: any, group: string) {
    return {};
  }
}
