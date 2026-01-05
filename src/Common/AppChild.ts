import AsyncConstructor from '@wexample/js-helpers/Common/AsyncConstructor';
import type App from './App';

export default class extends AsyncConstructor {
  constructor(protected readonly app: App) {
    super();

    this.app = app;
  }
}
