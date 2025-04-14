import * as d3 from 'd3'
import { MindMapLink, MindMapNode } from './types'
import { debounce } from 'es-toolkit'
import { clearDatabase, loadMindMap, saveMindMap } from './storage'
import GUI, { Controller } from 'lil-gui'

class MindMap {
  private nodes: MindMapNode[] = [{ id: 'root', name: '中心主题', x: 400, y: 300 }]
  private links: MindMapLink[] = []
  private simulation: d3.Simulation<MindMapNode, MindMapLink>
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
  private nodeElements!: d3.Selection<SVGGElement, MindMapNode, SVGGElement, unknown>
  private linkElements!: d3.Selection<SVGLineElement, MindMapLink, SVGGElement, unknown>
  private resizeObserver: ResizeObserver
  private zoomG!: d3.Selection<SVGGElement, unknown, HTMLElement, any>
  private transform = d3.zoomIdentity
  private gui!: GUI
  private statsFolder!: GUI
  private nodeCountController!: Controller
  private linkCountController!: Controller
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>

  constructor(container: string) {
    this.gui = new GUI({ width: 300 })
    this.setupGUI()
    // 初始化SVG画布
    this.svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .on('contextmenu', (event) => event.preventDefault()) // 禁用默认右键菜单

    this.zoomG = this.svg.append('g')
    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.transform = event.transform
        this.zoomG.attr('transform', event.transform)
      })

    this.svg.call(this.zoomBehavior)
    // 初始化力导向图
    this.simulation = d3
      .forceSimulation<MindMapNode>()
      .force(
        'link',
        d3
          .forceLink<MindMapNode, MindMapLink>(this.links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('collision', d3.forceCollide().radius(30))

    // 响应式布局
    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      this.updateLayout(width, height)
    })
    this.resizeObserver.observe(document.querySelector(container)!)

    this.initZoom()
    this.initMindMap()
  }

  private setupGUI() {
    // 添加控制面板功能
    const actions = {
      resetView: () => this.resetView(),
      clearDatabase: () => this.clearDatabase(),
      exportData: () => this.exportData(),
      nodeCount: () => this.nodes.length,
      linkCount: () => this.links.length,
    }

    // 添加操作按钮
    this.gui.title('工具栏')
    const actionsFolder = this.gui.addFolder('操作')
    actionsFolder.add(actions, 'resetView').name('重置视图')
    actionsFolder.add(actions, 'clearDatabase').name('清空数据库')
    actionsFolder.add(actions, 'exportData').name('导出数据')

    // 添加统计信息
    this.statsFolder = this.gui.addFolder('统计')
    this.nodeCountController = this.statsFolder
      .add({ nodeCount: this.nodes.length }, 'nodeCount')
      .name('节点数')
      .disable()
    this.linkCountController = this.statsFolder
      .add({ linkCount: this.links.length }, 'linkCount')
      .name('连接数')
      .disable()

    // 默认打开文件夹
    actionsFolder.open()
    this.statsFolder.open()

    // 每500ms更新统计信息
    setInterval(() => {
      this.updateStats()
    }, 500)
  }

  private updateStats() {
    this.nodeCountController.setValue(this.nodes.length)
    this.linkCountController.setValue(this.links.length)
  }

  private resetView() {
    this.svg.transition().duration(750).call(this.zoomBehavior.transform, d3.zoomIdentity)
  }

  private async clearDatabase() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      try {
        // 1. 清除数据库
        await clearDatabase()

        // 2. 重置内存数据
        const { width, height } = this.svg.node()!.getBoundingClientRect()
        this.nodes = [{ id: 'root', name: '中心主题', x: width / 2, y: height / 2 }]
        this.links = []

        // 3. 停止并重置力导向图
        this.simulation.stop()
        this.simulation.nodes(this.nodes)
        ;(this.simulation.force('link') as d3.ForceLink<MindMapNode, MindMapLink>).links(this.links)

        // 4. 完全重新渲染
        this.render()

        // 5. 重启模拟
        this.simulation.alpha(1).restart()

        // 6. 保存初始状态
        await saveMindMap(this.nodes, this.links)

        // 7. 更新统计信息
        this.updateStats()
      } catch (error) {
        console.error('清空数据库失败:', error)
        alert('清空数据库时出错')
      }
    }
  }

  private exportData() {
    const data = {
      nodes: this.nodes,
      links: this.links,
      transform: this.transform,
    }
    console.log('导出数据:', data)
    alert('数据已导出到控制台 (F12查看)')
  }

  private initZoom() {
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.transform = event.transform
        this.zoomG.attr('transform', event.transform)
      })

    this.svg
      .call(zoom)
      // 添加双击复位功能
      .on('dblclick.zoom', null)
      .on('dblclick', (event) => {
        if (event.target === this.svg.node()) {
          this.resetView()
        }
      })
  }

  private updateLayout(width: number, height: number) {
    // 更新中心力
    this.simulation
      .force('center', d3.forceCenter(width / 2, height / 2))
      .alpha(0.5)
      .restart()

    // 重置根节点位置到中心
    if (this.nodes.length > 0 && !this.nodes[0].x) {
      this.nodes[0].x = width / 2
      this.nodes[0].y = height / 2
      this.simulation.alpha(1).restart()
    }
  }

  private async initMindMap() {
    const data = await loadMindMap()
    this.nodes = data.nodes.length ? data.nodes : [{ id: 'root', name: '中心主题' }]
    this.links = data.links || []

    // 初始位置处理
    const { width, height } = this.svg.node()!.getBoundingClientRect()
    if (!this.nodes[0].x) {
      this.nodes[0].x = width / 2
      this.nodes[0].y = height / 2
    }

    this.render()
    this.setupInteractions()
    this.setupAutoSave()
  }

  private render() {
    // 绘制连线
    this.linkElements = this.zoomG
      .append('g')
      .selectAll<SVGLineElement, MindMapLink>('line')
      .data(this.links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)

    // 绘制节点（现在在zoomG下）
    this.nodeElements = this.zoomG
      .append('g')
      .selectAll<SVGGElement, MindMapNode>('g')
      .data(this.nodes, (d) => d.id)
      .join('g')
      .call(drag(this.simulation))

    this.nodeElements.append('circle').attr('r', 20).attr('fill', '#69b3a2')

    this.nodeElements
      .append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .text((d) => d.name)
      .attr('pointer-events', 'none')

    // 更新力导向图
    this.simulation.nodes(this.nodes)
    ;(this.simulation.force('link') as d3.ForceLink<MindMapNode, MindMapLink>).links(this.links)
    this.simulation.alpha(1).restart()

    // 动态更新位置
    this.simulation.on('tick', () => {
      this.linkElements
        .attr('x1', (d) => this.getNode(d.source)?.x ?? 0)
        .attr('y1', (d) => this.getNode(d.source)?.y ?? 0)
        .attr('x2', (d) => this.getNode(d.target)?.x ?? 0)
        .attr('y2', (d) => this.getNode(d.target)?.y ?? 0)

      this.nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })
  }

  private getNode(id: string | MindMapNode): MindMapNode | undefined {
    const nodeId = typeof id === 'string' ? id : id.id
    return this.nodes.find((n) => n.id === nodeId)
  }

  private setupInteractions() {
    // 左键双击节点：编辑文本
    this.nodeElements.on('dblclick', (event, d) => {
      if (event.button === 0) this.editNode(d)
    })

    // 右键单击节点：创建关联节点
    this.nodeElements.on('contextmenu', (event, d) => {
      event.preventDefault()
      this.addLinkedNode(d.id)
    })

    // 右键双击节点：删除节点（有3+链接时确认）
    this.nodeElements.on('mousedown', (event, d) => {
      if (event.button === 2 && event.detail === 2) {
        event.preventDefault()
        const linkCount = this.links.filter((l) => l.source === d.id || l.target === d.id).length

        if (linkCount >= 3) {
          if (confirm(`该节点有 ${linkCount} 个连接，确定删除吗？`)) {
            this.deleteNode(d.id)
          }
        } else {
          this.deleteNode(d.id)
        }
      }
    })

    // 右键单击空白处：创建独立节点
    this.svg.on('contextmenu', (event) => {
      if (event.target === this.svg.node()) {
        event.preventDefault()
        const [x, y] = d3.pointer(event)
        this.addIndependentNode(x, y)
      }
    })
  }

  private async addLinkedNode(parentId: string, name: string = '新节点') {
    const newNode = { id: `node-${Date.now()}`, name }
    this.nodes.push(newNode)
    this.links.push({ source: parentId, target: newNode.id })
    this.render()
    await saveMindMap(this.nodes, this.links)
  }

  private addIndependentNode(x: number, y: number, name: string = '独立节点') {
    this.nodes.push({ id: `node-${Date.now()}`, name, x, y })
    this.render()
  }

  private async deleteNode(nodeId: string) {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId)
    this.links = this.links.filter((l) => l.source !== nodeId && l.target !== nodeId)
    this.render()
    await saveMindMap(this.nodes, this.links)
  }

  private async editNode(node: MindMapNode) {
    const input = document.createElement('input')
    input.value = node.name
    input.style.position = 'absolute'
    input.style.left = `${node.x}px`
    input.style.top = `${node.y}px`

    input.onblur = () => {
      node.name = input.value
      document.body.removeChild(input)
      this.render()
    }

    input.onkeydown = (e) => {
      if (e.key === 'Enter') input.blur()
    }

    document.body.appendChild(input)
    input.focus()
    await saveMindMap(this.nodes, this.links)
  }

  private setupAutoSave() {
    // 任何数据变更后自动保存
    const saveDebounced = debounce(() => {
      saveMindMap(this.nodes, this.links)
    }, 500)

    this.simulation.on('tick', saveDebounced)
    this.simulation.on('end', saveDebounced)
  }
}

function drag(simulation: d3.Simulation<MindMapNode, MindMapLink>) {
  return d3
    .drag<SVGGElement, MindMapNode>()
    .on('start', function (event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on('drag', function (event, d) {
      // 考虑缩放变换后的正确坐标
      const [x, y] = d3.pointer(event, this.parentNode as SVGGElement)
      d.fx = x
      d.fy = y
    })
    .on('end', function (event, d) {
      if (!event.active) simulation.alphaTarget(0)
      setTimeout(() => {
        d.fx = null
        d.fy = null
        simulation.alpha(0.3).restart()
      }, 1000)
    })
}

// 初始化应用
export const mindMap = new MindMap('#app')
