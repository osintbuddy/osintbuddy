import { RefObject } from 'preact'
import { useEffect, useRef, useCallback, useMemo } from 'preact/hooks'

type Point = { x: number; y: number }

const EDGE_DIVIDER = 100
const FLOATING_POINT_LIMIT = 2

const useDraggableEdgeLabel = (
  labelX: number,
  labelY: number,
  labelPosition?: number,
  positionMode?: string
): [RefObject<SVGPathElement>, RefObject<HTMLDivElement>] => {
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

  // Generate points along the SVG path (memoized and throttled)
  const generatePathPoints = useCallback((): Point[] => {
    if (!edgePathRef.current) return []

    const path = edgePathRef.current
    const pathLength = path.getTotalLength()
    
    // Skip expensive recalculation if path length hasn't changed significantly
    if (Math.abs(pathLength - lastPathLength.current) < 1) {
      return pathPoints.current
    }
    
    lastPathLength.current = pathLength
    const points: Point[] = []

  for (let i = 0; i <= EDGE_DIVIDER; i++) {
    const distance = (pathLength / EDGE_DIVIDER) * i
    const point = path.getPointAtLength(distance)
    points.push({
      x: parseFloat(point.x.toFixed(FLOATING_POINT_LIMIT)),
      y: parseFloat(point.y.toFixed(FLOATING_POINT_LIMIT)),
    })
  }

    return points
  }, [])

// Calculate path index based on movement along path direction
const calculatePathIndexFromMovement = (
  mouseX: number,
  mouseY: number,
  currentPointIndex,
  dragState,
  pathPoints
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

  // Map projected movement to path progression
  const sensitivity = 0.16 // Adjust as needed for responsiveness
  const indexDelta = Math.round(projectedMovement * sensitivity)

  // Calculate new index from initial position
  const newIndex = dragState.current.initialIndex + indexDelta

  // Clamp to valid range
  return Math.max(0, Math.min(pathPoints.current.length - 1, newIndex))
}

// Calculate path direction vector at current position
const getPathDirection = (index: number, pathPoints): Point => {
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

const useDraggableEdgeLabel = (
  labelX: number,
  labelY: number
): [RefObject<SVGPathElement>, RefObject<HTMLDivElement>] => {
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

  // Calculate position along path as offset from center
  const getPathPositionOffset = (pathIndex: number): Point => {
    if (!edgePathRef.current || pathPoints.current.length === 0) {
      return { x: 0, y: 0 }
    }

    // Get the center point (where labelX, labelY should be)
    const centerIndex = Math.floor(EDGE_DIVIDER / 2)
    const centerPoint = pathPoints.current[centerIndex]
    const targetPoint = pathPoints.current[pathIndex]

    if (!centerPoint || !targetPoint) {
      return { x: 0, y: 0 }
    }

    // Calculate offset from center in SVG coordinates
    return {
      x: targetPoint.x - centerPoint.x,
      y: targetPoint.y - centerPoint.y,
    }
  }

  const setLabelPosition = useCallback((pathIndex?: number) => {
    if (!draggableEdgeLabelRef.current) return

    const index =
      pathIndex !== undefined ? pathIndex : currentPointIndex.current
    const offset = getPathPositionOffset(index)

    // Position relative to React Flow's calculated center point
    const x = labelX + offset.x
    const y = labelY + offset.y

    draggableEdgeLabelRef.current.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
  }, [labelX, labelY])

  // Handle mouse events for dragging (memoized)
  const handleMouseDown = useCallback((e: MouseEvent) => {
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
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.isDragging || !draggableEdgeLabelRef.current) return

    // Prevent event from interfering with graph panning
    e.preventDefault()
    e.stopPropagation()

    // Additional check: ensure shift is still held during drag
    if (!e.shiftKey) {
      // If shift is released, stop dragging
      handleMouseUp()
      return
    }

    // Calculate path index based on cursor movement
    const index = calculatePathIndexFromMovement(
      e.clientX,
      e.clientY,
      currentPointIndex,
      dragState,
      pathPoints
    )

    // Update current position and snap to path
    currentPointIndex.current = index
    setLabelPosition(index)
  }, [setLabelPosition])

  const handleMouseUp = useCallback(() => {
    if (!dragState.current.isDragging) return

    dragState.current.isDragging = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Handle touch events for mobile (memoized)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!draggableEdgeLabelRef.current || !e.touches[0] || !e.shiftKey) return

    // Prevent event from bubbling to React Flow
    e.preventDefault()
    e.stopPropagation()

    dragState.current.isDragging = true
    dragState.current.startX = e.touches[0].clientX
    dragState.current.startY = e.touches[0].clientY
    dragState.current.initialIndex = currentPointIndex.current

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (
      !dragState.current.isDragging ||
      !e.touches[0] ||
      !draggableEdgeLabelRef.current
    )
      return

    // Prevent event from interfering with graph interactions
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
  }, [setLabelPosition])

  const handleTouchEnd = useCallback(() => {
    if (!dragState.current.isDragging) return

    dragState.current.isDragging = false
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }, [])

  // Throttled path points update
  const updatePathPointsThrottled = useCallback(() => {
    if (pathUpdateScheduled.current || !edgePathRef.current) return
    
    pathUpdateScheduled.current = true
    requestAnimationFrame(() => {
      pathPoints.current = generatePathPoints()
      pathUpdateScheduled.current = false
    })
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
  }, [handleMouseDown, handleTouchStart, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Update path points when path changes or position mode changes
  useEffect(() => {
    if (edgePathRef.current) {
      updatePathPointsThrottled()
    }
  }, [edgePathRef.current, updatePathPointsThrottled, positionMode])

  // Update position when coordinates change or position mode changes (throttled)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLabelPosition()
    }, 16) // ~60fps throttling
    
    return () => clearTimeout(timeoutId)
  }, [labelX, labelY, setLabelPosition, positionMode])

  return [edgePathRef, draggableEdgeLabelRef]
}

export default useDraggableEdgeLabel
