'use strict';

const fs = require('fs');
const path = require('path');
const antpb = require('antpb');
const protocol = require('sofa-bolt-node');
const { ZookeeperRegistry } = require('sofa-rpc-node').registry;

module.exports = appInfo => {
  let proto;
  let classMap;
  let apiMeta;
  const protoPath = path.join(appInfo.baseDir, 'run/proto.json');
  const proxyClassDir = path.join(appInfo.baseDir, 'app/proxy_class');
  const apiMetaPath = path.join(appInfo.baseDir, 'config/apiMeta.json');
  // 加载 proto
  if (fs.existsSync(protoPath)) {
    proto = antpb.fromJSON(require(protoPath));
  }
  // 加载 classMap
  if (fs.existsSync(proxyClassDir)) {
    classMap = new Proxy({}, {
      get(target, className) {
        let map = target[className];
        if (!map) {
          const args = className.split('.');
          args.unshift(proxyClassDir);
          args[args.length - 1] = args[args.length - 1] + '.js';
          const classfile = path.join.apply(null, args);
          if (fs.existsSync(classfile)) {
            map = target[className] = require(classfile)[className];
          }
        }
        return map;
      },
    });
  }
  protocol.setOptions({ proto, classMap });

  if (fs.existsSync(apiMetaPath)) {
    apiMeta = require(apiMetaPath);
  }
  return {
    rpc: {
      registryClass: ZookeeperRegistry,
      registry: null,
      client: {
        protocol,
        responseTimeout: 3000,
      },
      server: {
        apiMeta,
        protocol,
        port: 12200,
        idleTime: 5000,
        killTimeout: 30000,
        maxIdleTime: 90 * 1000,
        responseTimeout: 3000,
        codecType: 'protobuf',
        selfPublish: true,
        // 下面配置针对新的 rpc 服务发布方式
        namespace: null,
        version: '1.0',
        group: 'SOFA',
        uniqueId: null,
        autoServe: true, // 如果发现有暴露服务，则自定启动 server
      },
    },
  };
};
