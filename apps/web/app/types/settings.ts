export type OrgRole = 'owner' | 'admin' | 'member'

export interface OrgMember {
  id:     string
  name:   string
  email:  string
  avatar: string
  color:  string
  role:   OrgRole
  status: 'active' | 'pending'
}
