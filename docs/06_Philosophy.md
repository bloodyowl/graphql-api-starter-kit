# Philosophy

> Rethinking established best practices™

## Low overhead

Use the language concepts and features rather than re-creating them: [modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), [functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions), [types](https://www.typescriptlang.org). Keep your dependencies to the minimum.

## No over abstraction

Don't create abstractions before a need emerges. There's no one-rule-fits-all on this.

## Cohesive responsibilities

Keep responsibilities (mutations, message handlers) cohesive rather than spreading them in different parts of the codebase. The app structure should roughly reflect its public API.

## Explorable codebase

The codebase should be understandable without external context and have explicit links between modules. It should be easy to find the desired module starting from the entry point.

## Explicit data flow

Don't use magic tools to inject dependencies or values, just pass your dependencies to your functions. See [context](./03_Context.md).

## Quick feedback loop

Running the app locally or running your test should be easy and fast to have a quick feedback loop in your development environment.
