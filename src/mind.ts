import * as d3 from 'd3'
import { debounce } from 'es-toolkit'
import { languagesData } from './mock' // 测试用
import { MindMapLink, MindMapNode } from './types'
import Swal from 'sweetalert2'

type SVGSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>

export class MindMap {
  svg: SVGSelection
  rootEl: HTMLElement
  simulation: d3.Simulation<MindMapNode, MindMapLink>
  private handleResize: () => void
  private zoomBehavior!: d3.ZoomBehavior<SVGSVGElement, unknown>
  private g: d3.Selection<SVGGElement, unknown, null, undefined> // 用于包含所有可缩放元素的组
  private transform: d3.ZoomTransform = d3.zoomIdentity // 当前变换状态

  constructor(rootSelector = '#app') {
    this.rootEl = d3.select(rootSelector).node() as HTMLElement
    this.svg = d3.select(this.rootEl).append('svg')

    // 添加一个包含所有可缩放元素的组
    this.g = this.svg.append('g')

    this.updateSize()

    this.handleResize = debounce(() => this.updateSize(), 100)
    window.addEventListener('resize', this.handleResize)

    this.simulation = this.initSimulation()
    this.initZoom() // 初始化缩放行为
  }

  private initSimulation() {
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
      .force('charge', d3.forceManyBody().strength(-3))
      .force('center', d3.forceCenter(...this.rootCenter))
      .force('collision', d3.forceCollide().radius(30))

    // 在组内创建元素而不是直接在svg中
    const linkElements = this.g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)

    const nodeElements = this.g
      .append('g')
      .selectAll<SVGCircleElement, MindMapNode>('circle')
      .data(languagesData.nodes)
      .join('circle')
      .attr('r', 10)
      .attr('fill', '#202020')
      .call(this.createDragBehavior(simulation))
      .on('mouseover', (e, d) => {
        d3.select(e.currentTarget).attr('fill', '#ff7f0e')
        labelElements
          .filter((label) => label === d)
          .attr('font-weight', 'bold')
          .attr('fill', '#ff7f0e')
      })
      .on('mouseout', () => {
        nodeElements.attr('fill', '#202020')
        labelElements.attr('font-weight', 'normal').attr('fill', '#303030')
      })
      .on('click', (event, d) => this.showNameEditDialog(event, d))

    const labelElements = this.g
      .append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .text((d) => d.name)
      .attr('font-size', 12)
      .attr('dx', 15)
      .attr('dy', 4)
      .attr('fill', '#303030')
      .style('pointer-events', 'none')

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

  private initZoom() {
    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5]) // 设置缩放范围
      .on('zoom', (event) => {
        this.transform = event.transform
        this.g.attr('transform', this.transform.toString())
      })

    this.svg.call(this.zoomBehavior)

    // 添加双击重置缩放的功能
    this.svg.on('dblclick', () => {
      this.svg.transition().duration(750).call(this.zoomBehavior.transform, d3.zoomIdentity)
    })
  }

  private createDragBehavior(
    simulation: d3.Simulation<MindMapNode, undefined>
  ): d3.DragBehavior<SVGCircleElement, MindMapNode, MindMapNode> {
    return d3
      .drag<SVGCircleElement, MindMapNode, MindMapNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()

        // 直接使用当前变换后的坐标，避免任何转换
        d.fx = d.x || 0
        d.fy = d.y || 0
      })
      .on('drag', (event, d) => {
        // 直接使用d3.event提供的坐标，不进行任何转换
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
  }

  private updateSize() {
    this.svg
      .attr('width', this.rootEl.clientWidth)
      .attr('height', this.rootEl.clientHeight)
      .attr('viewBox', `0 0 ${this.rootEl.clientWidth} ${this.rootEl.clientHeight}`)

    if (this.simulation) {
      // 更新中心力
      this.simulation.force('center', d3.forceCenter(...this.rootCenter))
      this.simulation.alpha(0.3).restart()
    }
  }

  private get rootCenter(): [number, number] {
    return [this.rootEl.clientWidth / 2, this.rootEl.clientHeight / 2]
  }

  private async showNameEditDialog(_event: MouseEvent, nodeData: MindMapNode) {
    const { value: newName } = await Swal.fire({
      title: '修改节点名称',
      input: 'text',
      inputValue: nodeData.name || '', // 当前名称作为默认值
      inputPlaceholder: '输入新名称',
      showCancelButton: true,
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value) return '名称不能为空！'
        return null
      },
    })

    if (newName) {
      // 更新数据
      nodeData.name = newName

      // 更新界面文本
      this.g
        .selectAll('text')
        .filter((d) => d === nodeData)
        .text(newName)
    }
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
    this.simulation.stop()
  }
}

export const mindMap = new MindMap()
