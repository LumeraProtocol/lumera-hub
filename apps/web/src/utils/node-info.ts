export interface NodeInfoResponse {
  default_node_info?: { network?: string };
  application_version?: { version?: string };
}

export interface NodeVersionInfo {
  network: string;
  appVersion: string;
}

export const parseNodeInfo = (data: NodeInfoResponse): NodeVersionInfo => {
  const network = data.default_node_info?.network || '';
  const version = data.application_version?.version || '';
  return {
    network,
    appVersion: version && !version.startsWith('v') ? `v${version}` : version,
  };
};
