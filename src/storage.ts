import Dexie from 'dexie'
import { MindMapLink, MindMapNode } from './types'

interface MindMapDB {
  nodes: Dexie.Table<MindMapNode, string>
  links: Dexie.Table<MindMapLink, number>
}

class MindMapDB extends Dexie {
  constructor() {
    super('MindMapDatabase')

    this.version(1).stores({
      nodes: 'id, name, x, y',
      links: '++id, source, target',
    })
  }
}

export const db = new MindMapDB()

export async function saveMindMap(nodes: MindMapNode[], links: MindMapLink[]) {
  await db.transaction('rw', db.nodes, db.links, async () => {
    await db.nodes.clear()
    await db.links.clear()
    await db.nodes.bulkAdd(nodes)
    await db.links.bulkAdd(links)
  })
}

export async function loadMindMap() {
  const [nodes, links] = await Promise.all([db.nodes.toArray(), db.links.toArray()])
  return { nodes, links }
}

export async function clearDatabase() {
  await db.transaction('rw', db.nodes, db.links, async () => {
    await db.nodes.clear()
    await db.links.clear()
  })
}
