import { test } from '@japa/runner'
import { headscaleClient, type HeadscaleNode } from '#services/headscale_client'

const IP = '100.64.0.1'
const TENANT = 'u-expected'

function node(id: string, user: string, ip = IP): HeadscaleNode {
  return { id, name: `node-${id}`, ipAddresses: [ip, 'fd7a::1'], user: { name: user } }
}

/**
 * ensureNodeTenant only ever calls these three, so stubbing them exercises the
 * decision without touching a control plane.
 */
function stub(own: HeadscaleNode[], all: HeadscaleNode[]) {
  const originals = {
    getNodesByUser: headscaleClient.getNodesByUser,
    listAllNodes: headscaleClient.listAllNodes,
    moveNode: headscaleClient.moveNode,
  }
  const moves: Array<{ nodeId: string; user: string }> = []

  headscaleClient.getNodesByUser = async () => own
  headscaleClient.listAllNodes = async () => all
  headscaleClient.moveNode = async (nodeId: string, user: string) => {
    moves.push({ nodeId, user })
  }

  return {
    moves,
    restore: () => Object.assign(headscaleClient, originals),
  }
}

test.group('Headscale tenant self-heal', () => {
  test('leaves a node that is already in the right tenant alone', async ({ assert }) => {
    const { moves, restore } = stub([node('1', TENANT)], [node('1', TENANT)])
    try {
      assert.equal(await headscaleClient.ensureNodeTenant(IP, TENANT), 'ok')
      assert.lengthOf(moves, 0)
    } finally {
      restore()
    }
  })

  test('moves a node stranded in another tenant', async ({ assert }) => {
    // What re-enrolling a machine into a second account produces: Headscale
    // keeps the original owner, so the node is invisible to the new account.
    const { moves, restore } = stub([], [node('7', 'u-previous-owner')])
    try {
      assert.equal(await headscaleClient.ensureNodeTenant(IP, TENANT), 'moved')
      assert.deepEqual(moves, [{ nodeId: '7', user: TENANT }])
    } finally {
      restore()
    }
  })

  test('reports a node that has not joined the mesh at all', async ({ assert }) => {
    const { moves, restore } = stub([], [node('9', 'u-someone', '100.64.0.99')])
    try {
      assert.equal(await headscaleClient.ensureNodeTenant(IP, TENANT), 'not_found')
      assert.lengthOf(moves, 0)
    } finally {
      restore()
    }
  })

  test('an empty address is never treated as a match', async ({ assert }) => {
    const { moves, restore } = stub([], [node('1', TENANT)])
    try {
      assert.equal(await headscaleClient.ensureNodeTenant('', TENANT), 'not_found')
      assert.lengthOf(moves, 0)
    } finally {
      restore()
    }
  })
})
