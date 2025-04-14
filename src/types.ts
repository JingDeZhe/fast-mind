import { SimulationNodeDatum, SimulationLinkDatum } from 'd3'

export interface MindMapNode extends SimulationNodeDatum {
  id: string
  name: string
}

export interface MindMapLink extends SimulationLinkDatum<MindMapNode> {
  source: string
  target: string
}
