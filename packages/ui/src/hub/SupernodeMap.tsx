'use client'

/*
 * The supernode map.
 *
 * A port of the redesign's cascade-map custom element into React, with one
 * substantive change: the prototype ships a hardcoded list of twenty-one cities
 * and a list of invented filenames. This takes its pins from the supernodes
 * that actually geolocated, so a dot is a machine someone is running.
 *
 * The arcs are motion, not claims. They show replication paths between real
 * nodes; nothing here asserts that a particular file took a particular hop, and
 * the caption names routes rather than inventing a filename to travel them.
 *
 * Drawn as raw SVG through d3-geo rather than with a charting library, because
 * the animation writes attributes on individual nodes every frame and going
 * through React's renderer for that would be slower and no clearer.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'

export type MapNode = {
  name: string
  lat: number
  lon: number
  /** How many supernodes resolved to this place. Sets the dot's size. */
  count: number
}

const NS = 'http://www.w3.org/2000/svg'
const el = <K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] => {
  const node = document.createElementNS(NS, name)
  for (const k in attrs) node.setAttribute(k, String(attrs[k]))
  return node
}

/** Surfaces and accents, matching the design's palette exactly. */
const OCEAN = '#021A34'
const OCEAN_EDGE = '#0C2A48'
const GRATICULE = '#062338'
const LAND = '#0A3459'
const LAND_EDGE = '#15507F'
const ACCENT = '#47C78A'
const FLASH = '#EAFBF2'

const SPAWN_MS = 2600
const FLIGHT_MS = 1400

type Flight = {
  points: Array<[number, number]>
  line: SVGPathElement
  head: SVGCircleElement
  target: Placed
  t: number
  delay: number
  done: boolean
  fade: number
}

type Placed = MapNode & { x: number; y: number; r: number; dot: SVGCircleElement }

export function SupernodeMap({
  nodes,
  height = 320,
  atlasUrl = '/geo/countries-110m.json',
}: {
  nodes: MapNode[]
  height?: number
  atlasUrl?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLDivElement>(null)
  const land = useRef<FeatureCollection | null>(null)
  const placed = useRef<Placed[]>([])
  const flights = useRef<Flight[]>([])
  const raf = useRef<number | null>(null)
  const spawn = useRef<number | null>(null)
  const captionTimer = useRef<number | null>(null)
  const layers = useRef<{ arcs: SVGGElement; dots: SVGGElement } | null>(null)

  // Identity of the node set, so a redraw only happens when the places change
  // rather than on every poll that returns the same supernodes.
  const key = useMemo(
    () => nodes.map((n) => `${n.name}:${n.lat.toFixed(3)}:${n.lon.toFixed(3)}:${n.count}`).join('|'),
    [nodes],
  )

  const draw = useCallback(() => {
    const box = host.current
    if (!box || !land.current) return

    const w = box.clientWidth || 900
    const h = box.clientHeight || height
    if (!w || !h) return

    box.querySelector('svg')?.remove()
    const svg = el('svg', { width: '100%', height: '100%', style: 'display:block' })
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.setAttribute('aria-hidden', 'true')

    const projection = geoNaturalEarth1().fitExtent(
      [
        [10, 8],
        [w - 10, h - 8],
      ],
      { type: 'Sphere' },
    )
    const path = geoPath(projection)

    const defs = el('defs')
    const gradient = el('radialGradient', { id: 'snPulse' })
    gradient.appendChild(el('stop', { offset: '0%', 'stop-color': ACCENT, 'stop-opacity': '.5' }))
    gradient.appendChild(el('stop', { offset: '100%', 'stop-color': ACCENT, 'stop-opacity': '0' }))
    defs.appendChild(gradient)
    svg.appendChild(defs)

    svg.appendChild(
      el('path', {
        d: path({ type: 'Sphere' }) ?? '',
        fill: OCEAN,
        stroke: OCEAN_EDGE,
        'stroke-width': 1,
      }),
    )
    svg.appendChild(
      el('path', {
        d: path(geoGraticule10()) ?? '',
        fill: 'none',
        stroke: GRATICULE,
        'stroke-width': 0.5,
      }),
    )
    for (const f of land.current.features) {
      svg.appendChild(
        el('path', { d: path(f) ?? '', fill: LAND, stroke: LAND_EDGE, 'stroke-width': 0.7 }),
      )
    }

    const arcs = el('g')
    const dots = el('g')
    svg.appendChild(arcs)
    svg.appendChild(dots)
    layers.current = { arcs, dots }

    placed.current = nodes.flatMap((n) => {
      const p = projection([n.lon, n.lat])
      if (!p) return []
      const r = 2.4 + Math.sqrt(Math.max(1, n.count)) * 1.15
      dots.appendChild(el('circle', { cx: p[0], cy: p[1], r: r + 6, fill: 'url(#snPulse)', opacity: '.35' }))
      const dot = el('circle', {
        cx: p[0],
        cy: p[1],
        r,
        fill: ACCENT,
        stroke: '#022B33',
        'stroke-width': 1,
      })
      dots.appendChild(dot)
      return [{ ...n, x: p[0], y: p[1], r, dot }]
    })

    // A flight in progress refers to the old projection, so clear them.
    flights.current = []
    box.insertBefore(svg, box.firstChild)
    ;(box as HTMLDivElement & { _path?: typeof path })._path = path
    ;(box as HTMLDivElement & { _proj?: typeof projection })._proj = projection
  }, [height, key, nodes])

  /** A dot brightens and throws a ring when something arrives. */
  const ping = useCallback((node: Placed) => {
    const group = layers.current?.dots
    if (!group) return
    const ring = el('circle', {
      cx: node.x,
      cy: node.y,
      r: node.r,
      fill: 'none',
      stroke: ACCENT,
      'stroke-width': 1.6,
    })
    group.appendChild(ring)

    const start = performance.now()
    const grow = () => {
      const e = (performance.now() - start) / 620
      if (e >= 1) {
        ring.remove()
        return
      }
      ring.setAttribute('r', String(node.r + e * 16))
      ring.setAttribute('opacity', String(1 - e))
      requestAnimationFrame(grow)
    }
    requestAnimationFrame(grow)

    node.dot.setAttribute('fill', FLASH)
    window.setTimeout(() => node.dot.setAttribute('fill', ACCENT), 260)
  }, [])

  const launch = useCallback(() => {
    const pts = placed.current
    const arcs = layers.current?.arcs
    if (pts.length < 2 || !arcs) return

    const source = pts[Math.floor(Math.random() * pts.length)]
    const targets = pts
      .filter((p) => p !== source)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    if (!targets.length) return

    if (caption.current) {
      caption.current.textContent = `${source.name} → ${targets.map((t) => t.name).join(', ')}`
      caption.current.style.opacity = '1'
      if (captionTimer.current) window.clearTimeout(captionTimer.current)
      captionTimer.current = window.setTimeout(() => {
        if (caption.current) caption.current.style.opacity = '0'
      }, 2200)
    }

    targets.forEach((target, i) => {
      const along = geoInterpolate([source.lon, source.lat], [target.lon, target.lat])
      const points = Array.from({ length: 49 }, (_, s) => along(s / 48) as [number, number])
      const line = el('path', {
        fill: 'none',
        stroke: ACCENT,
        'stroke-width': 1.4,
        'stroke-linecap': 'round',
        opacity: '.85',
      })
      const head = el('circle', { r: 2.6, fill: FLASH })
      arcs.appendChild(line)
      arcs.appendChild(head)
      flights.current.push({
        points,
        line,
        head,
        target,
        t: 0,
        delay: i * 180,
        dur: FLIGHT_MS,
        done: false,
        fade: 0,
      } as Flight & { dur: number })
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      if (!land.current) {
        const res = await fetch(atlasUrl)
        if (!res.ok) return
        const topo = (await res.json()) as Topology
        if (cancelled) return
        land.current = feature(topo, topo.objects.countries) as unknown as FeatureCollection
      }
      if (cancelled) return
      draw()

      const box = host.current
      if (!box) return

      const observer = new ResizeObserver(() => draw())
      observer.observe(box)

      // Motion is decoration. Someone who has asked for less of it gets the
      // map and the pins, and nothing that moves.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return () => observer.disconnect()
      }

      let last = performance.now()
      const step = () => {
        const now = performance.now()
        const dt = now - last
        last = now
        const path = (box as HTMLDivElement & { _path?: ReturnType<typeof geoPath> })._path
        const proj = (box as HTMLDivElement & { _proj?: ReturnType<typeof geoNaturalEarth1> })._proj

        flights.current = flights.current.filter((f) => {
          if (!path || !proj) return false
          if (f.delay > 0) {
            f.delay -= dt
            return true
          }
          f.t += dt / FLIGHT_MS
          const t = Math.min(f.t, 1)
          const n = Math.max(2, Math.round(t * (f.points.length - 1)) + 1)
          f.line.setAttribute(
            'd',
            path({ type: 'LineString', coordinates: f.points.slice(0, n) }) ?? '',
          )
          const head = proj(f.points[n - 1])
          if (head) {
            f.head.setAttribute('cx', String(head[0]))
            f.head.setAttribute('cy', String(head[1]))
          }
          if (t >= 1) {
            if (!f.done) {
              f.done = true
              ping(f.target)
              f.fade = 420
            }
            f.fade -= dt
            const o = Math.max(0, f.fade / 420)
            f.line.setAttribute('opacity', String(o * 0.85))
            f.head.setAttribute('opacity', String(o))
            if (f.fade <= 0) {
              f.line.remove()
              f.head.remove()
              return false
            }
          }
          return true
        })
        raf.current = requestAnimationFrame(step)
      }

      raf.current = requestAnimationFrame(step)
      window.setTimeout(launch, 500)
      spawn.current = window.setInterval(launch, SPAWN_MS)

      return () => observer.disconnect()
    }

    let teardown: (() => void) | undefined
    void boot().then((fn) => {
      teardown = fn ?? undefined
    })

    return () => {
      cancelled = true
      teardown?.()
      if (raf.current) cancelAnimationFrame(raf.current)
      if (spawn.current) window.clearInterval(spawn.current)
      if (captionTimer.current) window.clearTimeout(captionTimer.current)
      flights.current = []
    }
  }, [atlasUrl, draw, launch, ping])

  return (
    <div ref={host} className="relative w-full" style={{ height }}>
      <div
        ref={caption}
        className="pointer-events-none absolute bottom-3 left-3.5 font-mono text-micro text-text-muted opacity-0 transition-opacity duration-300"
      />
    </div>
  )
}
