export default class SelectiveFunctionDeploy {
    constructor(serverless, options, { log }) {
      this.serverless = serverless;
      this.options = options;
      this.log = log;
      this.logPrefix = '[serverless-selective-function-deploy]:';
  
      this.setupFunctionProperties();
      this.setupHooks();
    }
  
    setupHooks() {
      this.hooks = {
        'before:package:createDeploymentArtifacts': () => this.excludeNonDeployableFunctions(),
      };
    }
  
    setupFunctionProperties() {
      this.serverless.configSchemaHandler.defineFunctionProperties('aws', {
        properties: {
          toDeploy: { type: 'boolean' },
        },
        required: [],
      });
    }
  
    excludeNonDeployableFunctions() {
      const allFunctions = this.getAllFunctions();
  
      if (allFunctions.length === 0) {
        return;
      }
  
      const excludedFunctions = [];
      const toDeployFunctions = [];
  
      for (const functionName of allFunctions) {
        const func = this.getFunction(functionName);
        const { toDeploy = true } = func;
  
        if (typeof toDeploy !== 'boolean') {
          throw new this.serverless.classes.Error('toDeploy property must be a boolean');
        }
  
        if (!toDeploy) {
          this.excludeFunctionFromDeployment(functionName);
          excludedFunctions.push(functionName);
        } else {
          toDeployFunctions.push(functionName);
        }
      }
  
      if (excludedFunctions.length > 0 || toDeployFunctions.length > 0) {
        this.log.verbose(`${this.logPrefix} Pre-deployment function summary:`);
        this.log.verbose(`${this.logPrefix} Excluded ${excludedFunctions.length} function(s): ${excludedFunctions.join(', ')}`);
        this.log.verbose(`${this.logPrefix} Included ${toDeployFunctions.length} function(s): ${toDeployFunctions.join(', ')}`);
      }
  
      const summaryLog = `${this.logPrefix} Excluded ${excludedFunctions.length} function(s) from deployment, deploying ${toDeployFunctions.length} of ${allFunctions.length} function(s).`;
      const verbosePrompt = !this.options.verbose ? ' For more details, use --verbose command.' : '';
      this.log.notice(summaryLog + verbosePrompt);
    }
  
    excludeFunctionFromDeployment(functionName) {
      delete this.serverless.service.functions[functionName];
    }
  
    getAllFunctions() {
      return this.serverless.service.getAllFunctions();
    }
  
    getFunction(functionName) {
      return this.serverless.service.getFunction(functionName);
    }
  }