'use strict'

exports.main = `# this file is auto generated by AdoPiSoft. Do not edit manually!`

exports.static = `
auto  [INTERFACE]
iface  [INTERFACE]  inet  static
  address  [ADDRESS]/[PREFIX]
[GATEWAY]
[VLAN]
`
exports.dhcp = `
auto  [INTERFACE]
allow-hotplug  [INTERFACE]
iface  [INTERFACE]  inet  dhcp
[VLAN]
`
exports.staticFormat = (config) => {
  var is_vlan = typeof config.vlanid == 'number'
  return exports.static
    .replace(/\[INTERFACE\]/g, is_vlan? `${config.interface}.${config.vlanid}` : config.interface)
    .replace(/\[ADDRESS\]/, config.ip_address)
    .replace(/\[PREFIX\]/, config.prefix)
    .replace(/\[GATEWAY\]\n/, config.gateway? `  gateway  ${config.gateway}\n`: '')
    .replace(/\[VLAN\]/, is_vlan? `  vlan-raw-device ${config.interface}` : '')
    .trim()
}

exports.dhcpFormat = (config) => {
  var is_vlan = typeof config.vlanid == 'number'
  return exports.dhcp
    .replace(/\[INTERFACE\]/g, is_vlan? `${config.interface}.${config.vlanid}` : config.interface)
    .replace(/\[VLAN\]/, is_vlan? `  vlan-raw-device ${config.interface}` : '')
    .trim()
}

exports.manualFormat = config => {
  var is_vlan = typeof config.vlanid == 'number'
  var iface = is_vlan
    ? `${config.interface}.${config.vlanid}`
    : config.interface

  var ret = `iface ${iface} inet manual`
  return is_vlan
    ? ret + '\n  vlan-raw-device ' + config.interface
    : ret
}

exports.format = (config) => {
  var ret = config.dhcp
    ? exports.dhcpFormat(config)
    : config.manual
    ? exports.manualFormat(config)
    : exports.staticFormat(config)

  if (Array.isArray(config.bridge_ports)) {
    ret += `\n  bridge_ports ${config.bridge_ports.join(' ')}`
  }

  return ret
}

