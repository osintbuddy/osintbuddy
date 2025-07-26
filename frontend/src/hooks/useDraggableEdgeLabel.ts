import { RefObject } from 'preact'
import {
  useEffect,
  useRef,
  useCallback,
  MutableRef,
  useMemo,
} from 'preact/hooks'

type Point = { x: number; y: number }

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  initialIndex: number
}

const EDGE_DIVIDER = 100
const FLOATING_POINT_LIMIT = 2

// Map projected movement to path progression, adjust as needed for responsiveness
const DRAG_SENSITIVITY = 0.16

// Calculate path index based on movement along path direction
const calculatePathIndexFromMovement = (
  mouseX: number,
  mouseY: number,
  currentPointIndex: MutableRef<number>,
  dragState: MutableRef<DragState>,
  pathPoints: MutableRef<Point[]>
): number => {
  if (pathPoints.current.length === 0) {
    return currentPointIndex.current
  }

  // Calculate movement delta from drag start
  const deltaX = mouseX - dragState.current.startX
  const deltaY = mouseY - dragState.current.startY

  // Get the path direction at current position
  const pathDir = getPathDirection(currentPointIndex.current, pathPoints)

  // Project the mouse movement onto the path direction
  const projectedMovement = deltaX * pathDir.x + deltaY * pathDir.y

  const indexDelta = Math.round(projectedMovement * DRAG_SENSITIVITY)

  // Calculate new index from initial position
  const newIndex = dragState.current.initialIndex + indexDelta

  // Clamp to valid range
  return Math.max(0, Math.min(pathPoints.current.length - 1, newIndex))
}

// Calculate path direction vector at current position
const getPathDirection = (
  index: number,
  pathPoints: MutableRef<Point[]>
): Point => {
  if (
    pathPoints.current.length === 0 ||
    index < 0 ||
    index >= pathPoints.current.length
  ) {
    return { x: 1, y: 0 } // Default horizontal direction
  }

  // Get direction from previous to next point (or use adjacent points)
  const prevIndex = Math.max(0, index - 1)
  const nextIndex = Math.min(pathPoints.current.length - 1, index + 1)

  const prevPoint = pathPoints.current[prevIndex]
  const nextPoint = pathPoints.current[nextIndex]

  if (!prevPoint || !nextPoint) return { x: 1, y: 0 }

  // Calculate direction vector
  const dirX = nextPoint.x - prevPoint.x
  const dirY = nextPoint.y - prevPoint.y

  // Normalize the vector
  const length = Math.sqrt(dirX * dirX + dirY * dirY)
  return length > 0 ? { x: dirX / length, y: dirY / length } : { x: 1, y: 0 }
}

export default function useDraggableEdgeLabel(
  labelX: number,
  labelY: number,
  positionMode?: string
): [RefObject<SVGPathElement>, RefObject<HTMLDivElement>] {
  const edgePathRef = useRef<SVGPathElement>(null)
  const draggableEdgeLabelRef = useRef<HTMLDivElement>(null)
  const pathPoints = useRef<Point[]>([])
  const currentPointIndex = useRef(Math.floor(EDGE_DIVIDER / 2))
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialIndex: 0,
  })
  const lastPathLength = useRef<number>(0)
  const pathUpdateScheduled = useRef<boolean>(false)

  // Memoize path length to avoid expensive calculations
  const pathLength = useMemo(() => {
    if (!edgePathRef.current) return 0
    return edgePathRef.current.getTotalLength()
  }, [edgePathRef.current])

  // Generate points along the SVG path
  const generatePathPoints = useCallback((): Point[] => {
    if (!edgePathRef.current) return []

    // Skip recalculation if path length hasn't changed significantly
    if (Math.abs(pathLength - lastPathLength.current) < 1) {
      return pathPoints.current
    }

    lastPathLength.current = pathLength
    const points: Point[] = []

    for (let i = 0; i <= EDGE_DIVIDER; i++) {
      const distance = (pathLength / EDGE_DIVIDER) * i
      const point = edgePathRef.current.getPointAtLength(distance)
      points.push({
        x: parseFloat(point.x.toFixed(FLOATING_POINT_LIMIT)),
        y: parseFloat(point.y.toFixed(FLOATING_POINT_LIMIT)),
      })
    }

    return points
  }, [pathLength, positionMode])

  // Memoize center point calculation
  const centerPoint = useMemo(() => {
    if (pathPoints.current.length === 0) return null
    const centerIndex = Math.floor(EDGE_DIVIDER / 2)
    return pathPoints.current[centerIndex] || null
  }, [pathPoints.current])

  // Calculate position along path as offset from center
  const getPathPositionOffset = useCallback(
    (pathIndex: number): Point => {
      if (!edgePathRef.current || pathPoints.current.length === 0)
        return { x: 0, y: 0 }

      // Get the center point (where labelX, labelY should be)
      const centerIndex = Math.floor(EDGE_DIVIDER / 2)
      const centerPoint = pathPoints.current[centerIndex]
      const targetPoint = pathPoints.current[pathIndex]

      if (!centerPoint || !targetPoint) return { x: 0, y: 0 }
      // Calculate offset from center
      return {
        x: targetPoint.x - centerPoint.x,
        y: targetPoint.y - centerPoint.y,
      }
    },
    [centerPoint]
  )

  const setLabelPosition = useCallback(
    (pathIndex?: number) => {
      if (!draggableEdgeLabelRef.current) return

      const index =
        pathIndex !== undefined ? pathIndex : currentPointIndex.current
      const offset = getPathPositionOffset(index)

      // Position relative to React Flow's calculated center point
      const x = labelX + offset.x
      const y = labelY + offset.y
      draggableEdgeLabelRef.current.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`

      console.log(
        'setLabelPosition: ',
        `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        draggableEdgeLabelRef?.current?.style['transform'] ===
          `translate(-50%, -50%) translate(${x}px, ${y}px)`
      )
    },
    [labelX, labelY, draggableEdgeLabelRef, getPathPositionOffset]
  )

  // Handle mouse events for dragging (memoized)
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      console.log('handling mouseDown')
      if (!draggableEdgeLabelRef.current || !e.shiftKey) {
        dragState.current.isDragging = false
        return
      }
      // Prevent event from bubbling to React Flow (which would trigger panning)
      e.preventDefault()
      e.stopPropagation()

      dragState.current.isDragging = true
      dragState.current.startX = e.clientX
      dragState.current.startY = e.clientY
      dragState.current.initialIndex = currentPointIndex.current

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [positionMode]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      console.log('handling mouseMove')
      if (!dragState.current.isDragging || !draggableEdgeLabelRef.current)
        return
      e.preventDefault()
      e.stopPropagation()

      // Calculate path index based on cursor movement
      const index = calculatePathIndexFromMovement(
        e.clientX,
        e.clientY,
        currentPointIndex,
        dragState,
        pathPoints
      )
      console.log('move', index)
      // Update current position and snap to path
      currentPointIndex.current = index
      setLabelPosition(index)
    },
    [setLabelPosition, positionMode]
  )

  const handleMouseUp = useCallback(() => {
    console.log('handling mouseUp')
    if (!dragState.current.isDragging) return

    dragState.current.isDragging = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [positionMode])

  // Handle touch events for mobile (memoized)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!draggableEdgeLabelRef.current || !e.touches[0] || !e.shiftKey) return
    e.preventDefault()
    e.stopPropagation()

    dragState.current.isDragging = true
    dragState.current.startX = e.touches[0].clientX
    dragState.current.startY = e.touches[0].clientY
    dragState.current.initialIndex = currentPointIndex.current

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (
        !dragState.current.isDragging ||
        !e.touches[0] ||
        !draggableEdgeLabelRef.current
      )
        return
      e.preventDefault()
      e.stopPropagation()

      // Calculate path index based on touch movement
      const index = calculatePathIndexFromMovement(
        e.touches[0].clientX,
        e.touches[0].clientY,
        currentPointIndex,
        dragState,
        pathPoints
      )

      // Update current position and snap to path
      currentPointIndex.current = index
      setLabelPosition(index)
    },
    [setLabelPosition]
  )

  const handleTouchEnd = useCallback(() => {
    if (!dragState.current.isDragging) return

    dragState.current.isDragging = false
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }, [])

  // Throttled path points update with better scheduling
  const updatePathPointsThrottled = useCallback(() => {
    if (pathUpdateScheduled.current || !edgePathRef.current) return

    pathUpdateScheduled.current = true

    // Use setTimeout for better performance than requestAnimationFrame for non-visual updates
    setTimeout(() => {
      if (edgePathRef.current) {
        pathPoints.current = generatePathPoints()
      }
      pathUpdateScheduled.current = false
    }, 0)
  }, [generatePathPoints])

  // Setup event listeners once
  useEffect(() => {
    const element = draggableEdgeLabelRef.current
    if (!element) return

    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [
    handleMouseDown,
    handleTouchStart,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
    positionMode,
  ])

  // Update path points only when path changes significantly
  useEffect(() => {
    if (edgePathRef.current && pathLength > 0) {
      updatePathPointsThrottled()
    }
  }, [pathLength, updatePathPointsThrottled])

  // Update position when coordinates change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLabelPosition()
    }, 16) // ~60fps debouncing

    return () => clearTimeout(timeoutId)
  }, [labelX, labelY, setLabelPosition])

  // Handle position mode changes separately
  useEffect(() => {
    pathUpdateScheduled.current = true
    if (edgePathRef.current) {
      pathPoints.current = generatePathPoints()
      pathUpdateScheduled.current = false
    }
    setLabelPosition(currentPointIndex.current)
  }, [
    positionMode,
    pathUpdateScheduled.current,
    currentPointIndex.current,
    pathPoints.current,
    edgePathRef.current,
  ])

  return [edgePathRef, draggableEdgeLabelRef]
}
