# serverless-selective-function-deploy

[![npm version](https://img.shields.io/npm/v/serverless-selective-function-deploy?color=brightgreen&label=npm%20package)](https://www.npmjs.com/package/serverless-selective-function-deploy)
[![npm downloads](https://img.shields.io/npm/dm/serverless-selective-function-deploy)](https://www.npmjs.com/package/serverless-selective-function-deploy)


This plugin enables selective deployment of AWS Lambda functions in a Serverless Framework project by setting a `toDeploy` boolean in the function's configuration.

`toDeploy` property defaults to `true`, meaning that functions will be deployed unless explicitly set otherwise.


1. Add the plugin to your serverless.yml:
```yml
plugins:
  - serverless-selective-function-deploy
```

2. Mark functions with `toDeploy` in your function configuration

```yml
functions:
  myFunction:
    handler: handler.myFunction
    toDeploy: false
```