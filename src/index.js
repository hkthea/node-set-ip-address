'use strict'
var child_process = require('child_process')
var interfaces_d = require('./interfaces.d/index.js')
var dhcpcd = require('./dhcpcd/index.js')
var netplan = require('./netplan/index.js')
var { promisify } = require('util')

exports.configure = async (configs, drivers=['dhcpd', 'interfaces_d', 'netplan']) => {

  if (typeof configs == 'object' && !Array.isArray(configs))
    configs = [configs]

  var vlans_table = {}

  configs.forEach(c => {
    if (typeof c.vlanid == 'number') {
      var k = `${c.interface}.${c.vlanid}`
      if (vlans_table[k])
        throw new Error("Can't have same VLAN ID on interface " + c.interface)
      vlans_table[k] = true
      if (Array.isArray(c.bridge_ports))
        throw new Error(`VLAN ${c.vlanid} in "${c.interface}" cannot have bridged interfaces`)

      var ifname = `${c.interface}.${c.vlanid}`
      if (ifname.length > 15) {
        var i = ifname.length - 15
        ifname = ifname.substring(i)
      }
      c.ifname = ifname
    }
    if (Array.isArray(c.bridge_ports)) {
      c.bridge_ports.forEach(p => {
        configs.forEach(_c => {
          if (_c.interface != c.interface && Array.isArray(_c.bridge_ports) && _c.bridge_ports.includes(p))
            throw new Error(`Interface "${p}" is bridged in "${c.interface}" and "${_c.interface}"`)
        })
      })
    }
  })

  var sorted = configs
    .sort((a, b) => {
      return typeof(a.vlanid) == 'number' && typeof(b.vlanid) != 'number'
        ? 1
        : typeof a.vlanid != 'number' && typeof b.vlanid == 'number'
        ? -1
        : 0
    })
    .sort((a, b) => {
      var ret = !Array.isArray(a.bridge_ports) && Array.isArray(b.bridge_ports)
        ? -1
        : Array.isArray(a.bridge_ports) && !Array.isArray(b.bridge_ports)
        ? 1
        : 0
      return ret
    })

  var net_configs=[];
  if(drivers.indexOf('dhcpd')){
    net_configs.push(dhcpcd.configure(configs));
  }

  if(drivers.indexOf('interfaces_d')){
    net_configs.push(interfaces_d.configure(configs));
  }

  if(drivers.indexOf('netplan')){
    net_configs.push(netplan.configure(configs));
  }

  await Promise.all(net_configs);

}

exports.restartService = async () => {
  var { exec } = child_process
  var execPromise = promisify(exec)

  var error = null
  var network_service_restarted = false

  await execPromise('service networking restart')
    .then(() => network_service_restarted = true)
    .catch(e => {
      console.log(e)
      error = e
    })

  await execPromise('netplan try')
    .then(() => execPromise('netplan apply'))
    .then(() => network_service_restarted = true)
    .catch(e => {
      console.log(e)
      error = e
    })

  if (!network_service_restarted)
    return Promise.reject(error)

}
