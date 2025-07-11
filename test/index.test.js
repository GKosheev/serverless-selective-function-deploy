import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import SelectiveFunctionDeploy from '../index.js';

describe('SelectiveFunctionDeploy', () => {
  let serverless, options, log, plugin;

  beforeEach(() => {
    // Mock serverless object
    serverless = {
      service: {
        functions: {},
        getAllFunctions: () => Object.keys(serverless.service.functions),
        getFunction: (name) => serverless.service.functions[name]
      },
      configSchemaHandler: {
        defineFunctionProperties: () => {}
      },
      classes: {
        Error: Error
      }
    };

    // Mock options
    options = {
      verbose: false
    };

    // Mock log
    log = {
      verbose: () => {},
      notice: () => {},
      verboseMessages: [],
      noticeMessages: []
    };

    // Override log methods to capture messages for testing
    log.verbose = (message) => {
      log.verboseMessages.push(message);
    };

    log.notice = (message) => {
      log.noticeMessages.push(message);
    };

    plugin = new SelectiveFunctionDeploy(serverless, options, { log });
  });

  describe('constructor', () => {
    test('should initialize with correct properties', () => {
      assert.strictEqual(plugin.serverless, serverless);
      assert.strictEqual(plugin.options, options);
      assert.strictEqual(plugin.log, log);
      assert.strictEqual(plugin.logPrefix, '[serverless-selective-function-deploy]:');
    });

    test('should setup hooks correctly', () => {
      assert.ok(plugin.hooks);
      assert.ok(plugin.hooks['after:package:cleanup']);
      assert.strictEqual(typeof plugin.hooks['after:package:cleanup'], 'function');
    });
  });

  describe('setupFunctionProperties', () => {
    test('should define function properties schema', () => {
      let definedProperties = null;
      serverless.configSchemaHandler.defineFunctionProperties = (provider, schema) => {
        definedProperties = { provider, schema };
      };

      plugin.setupFunctionProperties();

      assert.strictEqual(definedProperties.provider, 'aws');
      assert.deepStrictEqual(definedProperties.schema, {
        properties: {
          toDeploy: { type: 'boolean' }
        },
        required: []
      });
    });
  });

  describe('excludeNonDeployableFunctions', () => {
    test('should return early when no functions exist', () => {
      serverless.service.functions = {};

      plugin.excludeNonDeployableFunctions();

      assert.strictEqual(log.verboseMessages.length, 0);
      assert.strictEqual(log.noticeMessages.length, 0);
    });

    test('should exclude functions with toDeploy: false', () => {
      serverless.service.functions = {
        func1: { toDeploy: false },
        func2: { toDeploy: true },
        func3: { toDeploy: false }
      };

      plugin.excludeNonDeployableFunctions();

      assert.strictEqual(Object.keys(serverless.service.functions).length, 1);
      assert.ok(serverless.service.functions.func2);
      assert.ok(!serverless.service.functions.func1);
      assert.ok(!serverless.service.functions.func3);
    });

    test('should default to toDeploy: true when property is not specified', () => {
      serverless.service.functions = {
        func1: {},
        func2: { toDeploy: true },
        func3: { handler: 'handler.js' }
      };

      plugin.excludeNonDeployableFunctions();

      assert.strictEqual(Object.keys(serverless.service.functions).length, 3);
      assert.ok(serverless.service.functions.func1);
      assert.ok(serverless.service.functions.func2);
      assert.ok(serverless.service.functions.func3);
    });

    test('should throw error for non-boolean toDeploy values', () => {
      serverless.service.functions = {
        func1: { toDeploy: 'yes' }
      };

      assert.throws(() => {
        plugin.excludeNonDeployableFunctions();
      }, {
        message: 'toDeploy property must be a boolean'
      });
    });

    test('should log verbose messages when verbose option is enabled', () => {
      options.verbose = true;
      serverless.service.functions = {
        func1: { toDeploy: false },
        func2: { toDeploy: true }
      };

      plugin.excludeNonDeployableFunctions();

      assert.ok(log.verboseMessages.some(msg => msg.includes('Pre-deployment function summary')));
      assert.ok(log.verboseMessages.some(msg => msg.includes('Excluded 1 function(s): func1')));
      assert.ok(log.verboseMessages.some(msg => msg.includes('Included 1 function(s): func2')));
    });

    test('should log notice message with correct counts', () => {
      serverless.service.functions = {
        func1: { toDeploy: false },
        func2: { toDeploy: true },
        func3: { toDeploy: false }
      };

      plugin.excludeNonDeployableFunctions();

      assert.strictEqual(log.noticeMessages.length, 1);
      const noticeMessage = log.noticeMessages[0];
      assert.ok(noticeMessage.includes('Excluded 2 function(s) from deployment'));
      assert.ok(noticeMessage.includes('deploying 1 of 3 function(s)'));
    });

    test('should include verbose prompt when verbose option is disabled', () => {
      options.verbose = false;
      serverless.service.functions = {
        func1: { toDeploy: false }
      };

      plugin.excludeNonDeployableFunctions();

      const noticeMessage = log.noticeMessages[0];
      assert.ok(noticeMessage.includes('For more details, use --verbose command'));
    });

    test('should not include verbose prompt when verbose option is enabled', () => {
      options.verbose = true;
      serverless.service.functions = {
        func1: { toDeploy: false }
      };

      plugin.excludeNonDeployableFunctions();

      const noticeMessage = log.noticeMessages[0];
      assert.ok(!noticeMessage.includes('For more details, use --verbose command'));
    });
  });

  describe('excludeFunctionFromDeployment', () => {
    test('should remove function from serverless service', () => {
      serverless.service.functions = {
        func1: { handler: 'handler1.js' },
        func2: { handler: 'handler2.js' }
      };

      plugin.excludeFunctionFromDeployment('func1');

      assert.ok(!serverless.service.functions.func1);
      assert.ok(serverless.service.functions.func2);
    });
  });

  describe('getAllFunctions', () => {
    test('should return all function names', () => {
      serverless.service.functions = {
        func1: {},
        func2: {},
        func3: {}
      };

      const functions = plugin.getAllFunctions();

      assert.deepStrictEqual(functions, ['func1', 'func2', 'func3']);
    });
  });

  describe('getFunction', () => {
    test('should return specific function', () => {
      const func1 = { handler: 'handler1.js' };
      serverless.service.functions = {
        func1: func1,
        func2: { handler: 'handler2.js' }
      };

      const result = plugin.getFunction('func1');

      assert.strictEqual(result, func1);
    });
  });

  describe('integration tests', () => {
    test('should handle complex scenarios with mixed function configurations', () => {
      serverless.service.functions = {
        apiFunction: { toDeploy: true, handler: 'api.handler' },
        cronFunction: { toDeploy: false, handler: 'cron.handler' },
        defaultFunction: { handler: 'default.handler' },
        debugFunction: { toDeploy: false, handler: 'debug.handler' }
      };

      plugin.excludeNonDeployableFunctions();

      // Should keep functions with toDeploy: true and default (undefined)
      assert.ok(serverless.service.functions.apiFunction);
      assert.ok(serverless.service.functions.defaultFunction);

      // Should exclude functions with toDeploy: false
      assert.ok(!serverless.service.functions.cronFunction);
      assert.ok(!serverless.service.functions.debugFunction);

      // Check logging
      const noticeMessage = log.noticeMessages[0];
      assert.ok(noticeMessage.includes('Excluded 2 function(s) from deployment'));
      assert.ok(noticeMessage.includes('deploying 2 of 4 function(s)'));
    });
  });
});