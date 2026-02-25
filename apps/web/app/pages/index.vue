<template>
  <div style="display:flex;flex-direction:column;gap:12px">
    <StatusPill status="online" />
    <StatusPill status="warning" />
    <StatusPill status="offline" />
    <StatusPill status="pending" />
    <StatusPill status="connected" />
    <CategoryBadge category="sbc" />
    <CategoryBadge category="vps" />
    <CategoryBadge category="router" />
    <CategoryBadge category="nas" />
    <CategoryBadge category="desktop" />
    <CategoryBadge category="other" />
  </div>
</template>