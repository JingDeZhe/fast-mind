import * as d3 from 'd3'
import type { Selection } from 'd3'
import { debounce } from 'es-toolkit'

type SVGSelection = Selection<SVGSVGElement, unknown, null, undefined>

export class MindMap {
  svg: SVGSelection
  rootEl: HTMLElement
  private handleResize: () => void
  constructor(rootSelector = '#app') {
    this.rootEl = d3.select(rootSelector).node() as HTMLElement
    this.svg = d3.select(this.rootEl).append('svg')
    this.updateSize()

    this.handleResize = debounce(() => this.updateSize(), 100)
    window.addEventListener('resize', this.handleResize)
  }

  private updateSize() {
    this.svg
      .attr('width', this.rootEl.clientWidth)
      .attr('height', this.rootEl.clientHeight)
      .attr('viewBox', `0 0 ${this.rootEl.clientWidth} ${this.rootEl.clientHeight}`)
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
  }
}

export const mindMap = new MindMap()
