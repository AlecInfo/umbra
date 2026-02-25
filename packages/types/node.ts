export type NodeStatus   = 'online' | 'offline' | 'warning' | 'pending' | 'connected'
export type NodeCategory = 'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'

export interface Node {
    id:         string
    name:       string
    ip:         string
    location:   string
    country:    string
    status:     NodeStatus
    category:   NodeCategory
    latency:    number | null   // ms, null if offline
    cpu:        number | null   // %
    ram:        number | null   // %
    disk:       number | null   // %
    temp:       number | null   // °C
    uptime:     number | null   // seconds
    lastSeen:   string | null   // ISO date
}