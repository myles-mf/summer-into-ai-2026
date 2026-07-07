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
      const api = createScene(canvasRef.current, nodes, onPick)
      apiRef.current = api
      // ResizeObserver (not a window 'resize' listener) so the camera's
      // aspect ratio is corrected the moment the canvas gets its real
      // flex-layout size, not just on browser window resizes — otherwise
      // the camera can be stuck with the 0x0 size it briefly had at mount.
      const ro = new ResizeObserver(() => api.resize())
      ro.observe(canvasRef.current)
      return () => {
        ro.disconnect()
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

    return <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
  }
)

export default PalaceScene
