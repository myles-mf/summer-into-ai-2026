'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { createScene, type SceneAPI } from '../lib/three-scene'
import type { ClaimedNode } from '../lib/claim'

export type PalaceSceneHandle = SceneAPI

const PalaceScene = forwardRef<PalaceSceneHandle, { claimed: ClaimedNode[]; onPick?: (propId: string) => void }>(
  function PalaceScene({ claimed, onPick }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const apiRef = useRef<SceneAPI | null>(null)
    const claimedKey = claimed.map((c) => c.prop.id).join('|')

    useEffect(() => {
      if (!canvasRef.current) return
      const api = createScene(canvasRef.current, claimed, onPick)
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
    }, [claimedKey])

    useImperativeHandle(
      ref,
      () => ({
        setActive: (id) => apiRef.current?.setActive(id),
        flyTo: (id, d) => apiRef.current?.flyTo(id, d),
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
