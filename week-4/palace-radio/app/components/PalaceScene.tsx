'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createScene, type SceneAPI } from '../lib/three-scene'
import type { BeaconNode } from '../lib/nodes'

export type PalaceSceneHandle = SceneAPI

const PalaceScene = forwardRef<PalaceSceneHandle, { nodes: BeaconNode[]; onPick?: (index: number) => void }>(
  function PalaceScene({ nodes, onPick }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const apiRef = useRef<SceneAPI | null>(null)
    const nodesKey = nodes.map((n) => n.locus).join('|')

    useEffect(() => {
      if (!canvasRef.current || nodes.length === 0) return
      const api = createScene(canvasRef.current, nodes)
      apiRef.current = api
      const onResize = () => api.resize()
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
        api.dispose()
        apiRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesKey])

    useImperativeHandle(
      ref,
      () => ({
        setActive: (i) => apiRef.current?.setActive(i),
        flyTo: (i, d) => apiRef.current?.flyTo(i, d),
        pickAt: (x, y) => apiRef.current?.pickAt(x, y) ?? null,
        resize: () => apiRef.current?.resize(),
        dispose: () => apiRef.current?.dispose(),
      }),
      []
    )

    return (
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          const idx = apiRef.current?.pickAt(e.clientX, e.clientY)
          if (idx !== null && idx !== undefined) onPick?.(idx)
        }}
      />
    )
  }
)

export default PalaceScene
