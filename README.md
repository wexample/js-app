# @wexample/js-app

Version: 0.0.51

`@wexample/js-app` is a small browser-side application kernel in TypeScript: the `App` class in src/Common/App.ts attaches itself to `window[globalName]` (`app` by default), waits for the document to be parsed, then instantiates the services returned by `getServices()` — pulling in each class's static `dependencies` along the way — and seals itself before running the ready callback. Services extend `AppService` (src/Common/AppService.ts) and expose their startup work through `registerHooks()`; `MixinsService.invokeUntilComplete()` calls every `hookInit` in turn and re-queues any service that returns `AppService.LOAD_STATUS_WAIT`, so a service that depends on another's result can simply ask to be retried later. It is meant for front-end code in the Wexample suite that needs a shared service registry with ordered, asynchronous initialisation rather than a full framework.

## Table of Contents

- [Architecture](#architecture)
- [Integration in the Suite](#integration-in-the-suite)
- [Dependencies](#dependencies)
- [Versioning & Compatibility Policy](#versioning--compatibility-policy)
- [License](#license)
- [About us](#about-us)
- [Migration Notes](#migration-notes)

## Architecture

The package ships four source directories and no build output: `src/Common` holds the runtime classes, `src/Services` the single bundled service, `src/Types` and `src/Interfaces` the type layer. Everything under `src` is published as-is (`"files": ["src"]`, and an `exports` map whose `types` and `default` both point at `./src/*.ts`), so consumers compile the TypeScript themselves and `npm run build` here is only `tsc --noEmit`.

### The parts and what each owns

`App` (src/Common/App.ts) owns the boot sequence and the service registry. It is the only class that touches `window`, `document` and `this.services`.

`AppChild` (src/Common/AppChild.ts) owns one thing: the back-reference to the app. Its whole body is `constructor(protected readonly app: App)`. Anything that needs to reach the app extends it.

`AppService` (src/Common/AppService.ts) is the abstract base every service extends. It owns the contract with the kernel — the static `serviceName` used as the registry key, the static `dependencies` list, the two load statuses (`LOAD_STATUS_COMPLETE` / `LOAD_STATUS_WAIT`), and the two overridable methods `registerHooks()` and `registerMethods()`. Both return `{}` by default, so a service that overrides nothing is inert but valid.

`MixinsService` (src/Services/MixinsService.ts) owns hook dispatch. It is registered under the name `mixins` and is the only service `App.getServices()` returns by default, because `loadAndInitServices()` calls `this.services.mixins.invokeUntilComplete(...)` directly — the kernel cannot initialise anything without it.

The type layer is small and load-bearing. src/Types/AppServiceTypes.ts defines `AppServiceConstructor` (a constructor taking `(app, ...args)` plus the two statics) and `ServiceDefinition`, which is either that constructor or a `[constructor, args]` tuple — the tuple form is how a service receives constructor arguments. src/Interfaces/ServicesRegistryInterface.ts is the typed view of `App.services`; it declares `mixins?` only.

### The path a call takes at boot

`new App(readyCallback?, globalName = 'app')` runs synchronously: it calls `super()`, then assigns `window[globalName] = this` — the global exists before anything is initialised. It then reads `document.readyState` and schedules `run` either through `this.defer()` (a `queueMicrotask`, when the document is already `complete`, `loaded` or `interactive`) or on `DOMContentLoaded`.

`run` is four awaited steps in order:

1. `beforeReady()` — the subclass hook. Its base implementation is `await this.loadAndInitServices(this.getServices())`; a subclass that overrides it must call `super.beforeReady()` or no service is ever loaded.
2. `seal()` — `Object.seal(this)`, inherited from `AsyncConstructor`. This is shallow: after this point you can still write `this.services[name] = …`, but assigning a new property on the app instance throws.
3. `readyComplete()` — flushes every callback registered through `ready()`.
4. the `readyCallback` passed to the constructor, last.

`App` extends `AsyncConstructor` from `@wexample/js-helpers`, which supplies `isReady`, `ready()`, `defer()`, `readyComplete()` and `seal()`. `AppChild` extends it too, so services inherit the same ready mechanics.

### Service resolution

`loadServices()` first expands the list through `getServicesAndDependencies()`, which walks each class's static `dependencies` recursively and appends them: `services = [...services, ...this.getServicesAndDependencies(serviceClass.dependencies)]`. A dependency therefore lands *after* the service that declares it — construction order is not topological, and neither is hook order. `arrayUnique()` then dedups, but only by reference: a `[Class, args]` tuple is a fresh array on every call and will not collapse. The effective guard against double instantiation is in the loop below, `if (!this.services[name])`, keyed on `serviceClass.serviceName`.

Instances are stored in `this.services` under that name and the newly created ones are returned, so a second `loadAndInitServices()` call initialises only what it just added.

`getService(name)` accepts either a string or the class itself — `name = typeof name === 'string' ? name : name.serviceName`.

### Hook invocation

`invokeUntilComplete(method, group, args, timeoutLimit, services)` is a queue, not a loop over an array. It `shift()`s a service, reads `service.registerHooks()?.[group]?.[method]`, and if that is a function applies it with `args.concat([registry])` — the registry of every service's status so far is always the last argument a hook receives.

The return value drives ordering. `undefined` is normalised to `LOAD_STATUS_COMPLETE`; returning `AppService.LOAD_STATUS_WAIT` pushes the service back onto the queue, to be retried after the others have run. This is how a service that needs another's result gets its ordering right despite the flat resolution order above.

Two guards bound the queue. A `loops` counter caps total iterations at 100 and throws, collecting the last ten services into `errorTrace`. A `setTimeout(…, timeoutLimit)` armed before each hook and cleared after it throws on a hook that never settles — but from inside a timer callback, outside the awaiting promise chain, so that one surfaces as an uncaught error rather than a rejected promise. `loadAndInitServices` passes `undefined` for `timeoutLimit`, which falls through to the default of 2000 ms.

The kernel calls this exactly once, as `invokeUntilComplete('hookInit', 'app', [], undefined, loadedServices)`. The `group` argument matches the keys `registerHooks()` returns — `app`, `page`, `renderNode`.

### Conventions to follow when editing

Value imports inside the package go through the package name, not a relative path: `App.ts` reads `import MixinsService from '@wexample/js-app/Services/MixinsService'` and `MixinsService.ts` reads `import AppService from '@wexample/js-app/Common/AppService'`. Type-only imports use relative specifiers with the `.js` extension — `import type App from './App.js'`. The self-reference resolves through the `@wexample/js-app/*` path mapping in tsconfig.json, which also maps sibling packages to `../js-helpers/src` and `../js-pseudocode/src` — the monorepo checkout, not `node_modules`.

Registering a new service means giving it a static `serviceName`, adding it to the list returned by `getServices()` (or to another service's static `dependencies`), and declaring it on `ServicesRegistryInterface` if it is to be reachable as `app.services.<name>` with types.

One trap: `src/Common/App.d.ts` is a stale emitted declaration sitting next to the source. It declares `export default class App extends AsyncConstructor {}` with no members and points at a `sourceMappingURL` that is not shipped. The real definition is `App.ts`.

## Integration in the Suite

This package is part of the Wexample Suite — a collection of high-quality, modular tools designed to work seamlessly together across multiple languages and environments.

### Related Packages

The suite includes packages for configuration management, file handling, prompts, and more. Each package can be used independently or as part of the integrated suite.

Visit the [Wexample Suite documentation](https://docs.wexample.com) for the complete package ecosystem.

## Dependencies

- @wexample/js-helpers: 0.0.37

## Versioning & Compatibility Policy

Wexample packages follow **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

We maintain backward compatibility within major versions and provide clear migration guides for breaking changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Free to use in both personal and commercial projects.

## About us

[Wexample](https://wexample.com) stands as a cornerstone of the digital ecosystem — a collective of seasoned engineers, researchers, and creators driven by a relentless pursuit of technological excellence. More than a media platform, it has grown into a vibrant community where innovation meets craftsmanship, and where every line of code reflects a commitment to clarity, durability, and shared intelligence.

This packages suite embodies this spirit. Trusted by professionals and enthusiasts alike, it delivers a consistent, high-quality foundation for modern development — open, elegant, and battle-tested. Its reputation is built on years of collaboration, refinement, and rigorous attention to detail, making it a natural choice for those who demand both robustness and beauty in their tools.

Wexample cultivates a culture of mastery. Each package, each contribution carries the mark of a community that values precision, ethics, and innovation — a community proud to shape the future of digital craftsmanship.

## Migration Notes

When upgrading between major versions, refer to the migration guides in the documentation.

Breaking changes are clearly documented with upgrade paths and examples.
