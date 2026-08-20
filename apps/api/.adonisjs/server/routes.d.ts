import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.me': { paramsTuple?: []; params?: {} }
    'auth.update_profile': { paramsTuple?: []; params?: {} }
    'auth.change_password': { paramsTuple?: []; params?: {} }
    'auth.sessions': { paramsTuple?: []; params?: {} }
    'auth.revoke_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'auth.login_logs': { paramsTuple?: []; params?: {} }
    'auth.delete_account': { paramsTuple?: []; params?: {} }
    'nodes.index': { paramsTuple?: []; params?: {} }
    'nodes.store': { paramsTuple?: []; params?: {} }
    'nodes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.metrics': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.peers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.enroll_token': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.index': { paramsTuple?: []; params?: {} }
    'api_keys.store': { paramsTuple?: []; params?: {} }
    'api_keys.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'alerts.index': { paramsTuple?: []; params?: {} }
    'connections.index': { paramsTuple?: []; params?: {} }
    'orgs.index': { paramsTuple?: []; params?: {} }
    'orgs.store': { paramsTuple?: []; params?: {} }
    'orgs.accept_invitation': { paramsTuple?: []; params?: {} }
    'orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.members': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.update_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'orgs.invitations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invitationId': ParamValue} }
    'connect.connect': { paramsTuple?: []; params?: {} }
    'connect.disconnect': { paramsTuple?: []; params?: {} }
    'agent.register': { paramsTuple?: []; params?: {} }
    'agent.version': { paramsTuple?: []; params?: {} }
    'agent.heartbeat': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'auth.sessions': { paramsTuple?: []; params?: {} }
    'auth.login_logs': { paramsTuple?: []; params?: {} }
    'nodes.index': { paramsTuple?: []; params?: {} }
    'nodes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.metrics': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.peers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.index': { paramsTuple?: []; params?: {} }
    'alerts.index': { paramsTuple?: []; params?: {} }
    'connections.index': { paramsTuple?: []; params?: {} }
    'orgs.index': { paramsTuple?: []; params?: {} }
    'orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.members': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.invitations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agent.version': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'auth.sessions': { paramsTuple?: []; params?: {} }
    'auth.login_logs': { paramsTuple?: []; params?: {} }
    'nodes.index': { paramsTuple?: []; params?: {} }
    'nodes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.metrics': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.peers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.index': { paramsTuple?: []; params?: {} }
    'alerts.index': { paramsTuple?: []; params?: {} }
    'connections.index': { paramsTuple?: []; params?: {} }
    'orgs.index': { paramsTuple?: []; params?: {} }
    'orgs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.members': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.invitations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agent.version': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.change_password': { paramsTuple?: []; params?: {} }
    'nodes.store': { paramsTuple?: []; params?: {} }
    'nodes.enroll_token': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nodes.transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.store': { paramsTuple?: []; params?: {} }
    'orgs.store': { paramsTuple?: []; params?: {} }
    'orgs.accept_invitation': { paramsTuple?: []; params?: {} }
    'orgs.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'connect.connect': { paramsTuple?: []; params?: {} }
    'agent.register': { paramsTuple?: []; params?: {} }
    'agent.heartbeat': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'auth.update_profile': { paramsTuple?: []; params?: {} }
    'nodes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.update_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
  }
  DELETE: {
    'auth.revoke_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'auth.delete_account': { paramsTuple?: []; params?: {} }
    'nodes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api_keys.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orgs.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'userId': ParamValue} }
    'orgs.revoke_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'invitationId': ParamValue} }
    'connect.disconnect': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}