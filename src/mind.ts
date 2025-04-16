import * as d3 from 'd3'
import { debounce } from 'es-toolkit'
import { languagesData } from './mock' // 测试用
import { MindMapLink, MindMapNode } from './types'

type SVGSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>

export class MindMap {
  svg: SVGSelection
  rootEl: HTMLElement
  simulation: d3.Simulation<MindMapNode, MindMapLink>
  private handleResize: () => void
  constructor(rootSelector = '#app') {
    this.rootEl = d3.select(rootSelector).node() as HTMLElement
    this.svg = d3.select(this.rootEl).append('svg')
    this.updateSize()

    this.handleResize = debounce(() => this.updateSize(), 100)
    window.addEventListener('resize', this.handleResize)

    this.simulation = this.initSimulation()
  }

  private initSimulation() {
    const svg = this.svg
    const data = languagesData

    const links = data.links.map((d) => ({
      source: data.nodes.find((n) => n.id === d.source)!,
      target: data.nodes.find((n) => n.id === d.target)!,
    }))

    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => (d as MindMapLink).source)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(...this.rootCenter))
      .force('collision', d3.forceCollide().radius(30))

    const linkElements = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)

    const nodeElements = svg
      .append('g')
      .selectAll<SVGCircleElement, MindMapNode>('circle')
      .data(languagesData.nodes)
      .join('circle')
      .attr('r', 10)
      .call(createDragBehavior(simulation))

    const labelElements = svg
      .append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .text((d) => d.name)
      .attr('font-size', 12)
      .attr('dx', 15)
      .attr('dy', 4)

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => (d.source as MindMapNode).x!)
        .attr('y1', (d) => (d.source as MindMapNode).y!)
        .attr('x2', (d) => (d.target as MindMapNode).x!)
        .attr('y2', (d) => (d.target as MindMapNode).y!)

      nodeElements.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)

      labelElements.attr('x', (d) => d.x!).attr('y', (d) => d.y!)
    })

    return simulation
  }

  private updateSize() {
    this.svg
      .attr('width', this.rootEl.clientWidth)
      .attr('height', this.rootEl.clientHeight)
      .attr('viewBox', `0 0 ${this.rootEl.clientWidth} ${this.rootEl.clientHeight}`)
  }

  private get rootCenter(): [number, number] {
    return [this.rootEl.clientWidth / 2, this.rootEl.clientHeight / 2]
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
  }
}

export const mindMap = new MindMap()

function createDragBehavior(
  simulation: d3.Simulation<MindMapNode, undefined>
): d3.DragBehavior<SVGCircleElement, MindMapNode, MindMapNode> {
  return d3
    .drag<SVGCircleElement, MindMapNode, MindMapNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x ?? 0 // 安全访问
      d.fy = d.y ?? 0
    })
    .on('drag', (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    })
}
