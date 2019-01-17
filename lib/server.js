'use strict';

const http = require('http');
const is = require('is-type-of');
const assert = require('assert');
const cluster = require('cluster');
const { RpcServer } = require('sofa-rpc-node').server;

class EggRpcServer extends RpcServer {
  constructor(app) {
    const options = app.config.rpc && app.config.rpc.server;
    const selfPublish = options.selfPublish && cluster.isWorker;

    let registry = app.rpcRegistry;
    if (selfPublish && app.rpcRegistry) {
      registry = new app.rpcRegistry.DataClient(app.rpcRegistry.options);
    }

    const apiMeta = options.apiMeta || {};
    const classMap = {};
    for (const interfaceName in apiMeta) {
      const meta = apiMeta[interfaceName];
      const classMaps = meta.classMaps || {};
      for (const clazz in classMaps) {
        assert(!classMap[clazz], `[egg-rpc-server] ${clazz} duplicate definition`);
        classMap[clazz] = classMaps[clazz];
      }
    }

    super(Object.assign({
      appName: app.name,
      // 如果是 selfPublish 单独创建 registry 连接来发布服务
      registry,
      classMap,
      logger: app.coreLogger,
    }, options));

    this.app = app;
    this.selfPublish = selfPublish;
    this.apiMeta = apiMeta;

    // 等 app 已经 ready 后才向注册中心注册服务
    app.ready(err => {
      if (!err) {
        this.load();
        this.publish();
        this.logger.info('[egg-rpc#server] publish all rpc services after app ready');
      }
    });
  }

  get listenPorts() {
    let port = this.options.port;
    if (this.selfPublish) {
      port = port + cluster.worker.id;
      this.publishPort = port;
      return [ port, this.options.port ];
    }
    return [ port ];
  }

  load() {
    const { app } = this;
    const { namespace } = app.config.rpc.server;

    // load apiMeta
    for (const name in app.rpcServices) {
      let delegate = app.rpcServices[name];

      const interfaceName = `${namespace}.${name}`;
      const service = Object.assign({ interfaceName }, app.config.rpc.server);
      if (delegate.interfaceName || delegate.namespace) {
        service.interfaceName = delegate.interfaceName ? delegate.interfaceName : `${delegate.namespace}.${name}`;
        service.uniqueId = delegate.uniqueId || '';
        service.version = delegate.version || service.version;
        service.group = delegate.group || service.group;
      }

      if (is.class(delegate)) {
        delegate = wrap(app, delegate);
      } else {
        for (const key of Object.keys(delegate)) {
          delegate[key] = app.toAsyncFunction(delegate[key]);
        }
      }
      this.addService(service, delegate);
    }
  }

  /**
   * @param {HSFRequest} req
   *   - @param {Object} requestProps
   *   - @param {Number} packetId
   *   - @param {String} packetType
   *   - @param {String} methodName
   *   - @param {String} serverSignature interfaceName
   *   - @param {Array} args
   * @param {HSFResponse} res
   *   - @param {Function} send
   * @return {Context} ctx
   */
  createContext(req, res) {
    assert(req && req.data, '[egg-rpc#server] req && req.data is required');
    const reqData = req.data;
    const { serverSignature, methodName, args } = reqData;
    const httpReq = {
      method: 'RPC',
      url: '/rpc/' + serverSignature + '/' + methodName,
      headers: {},
      socket: res.socket,
    };
    const ctx = this.app.createContext(httpReq, new http.ServerResponse(httpReq));
    ctx.params = args;
    return ctx;
  }

  addService(service, delegate) {
    assert(service && delegate, '[egg-rpc#server] addService(service, delegate) service & delegate is required');
    if (is.string(service)) {
      service = {
        interfaceName: service,
        version: this.options.version,
        group: this.options.group,
      };
    }
    // 将 app 传入
    service.app = this.app;
    service.apiMeta = this.apiMeta[service.interfaceName];
    return super.addService(service, delegate);
  }

  _handleUncaughtError() {
    if (this.selfPublish) {
      this.unPublish();
      this.logger.warn('[egg-rpc#server] unPublish all rpc services for uncaughtException in this process %s', process.pid);
    } else {
      this.logger.warn('[egg-rpc#server] rpc server is down, cause by uncaughtException in this process %s', process.pid);
    }
  }
}

function wrap(app, Class) {
  const proto = Class.prototype;
  const result = {};
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (!is.asyncFunction(proto[key]) && !is.generatorFunction(proto[key])) {
      continue;
    }

    proto[key] = app.toAsyncFunction(proto[key]);
    result[key] = async function(...args) {
      const instance = new Class(this);
      return await instance[key](...args);
    };
  }
  return result;
}

module.exports = EggRpcServer;
